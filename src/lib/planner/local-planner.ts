import type { Activity, DayPlan, GeneratedTrip, Hotel, TransportationStep, TripData } from "@/types/trip";
import { KB, KB_ALIASES, type DestinationKB, type Poi } from "./kb";
import { findPlace, findAirportHub, haversineKm, type Place } from "@/lib/geo/gazetteer";
import { findAlternatives } from "@/lib/agent/alternatives";
import { mulberry32 } from "@/lib/slm/network";
import { fnv1a } from "@/lib/slm/features";
import { resolveRealHotels } from "@/lib/hotels/data";

/**
 * Keyless, deterministic trip planner (replaces the old cloud-LLM generator).
 *  - Uses the curated offline KB when the destination is known, otherwise a geo-aware generic plan.
 *  - Crowd-aware slotting: peak-crowd sights go into the opening window, outdoor items avoid midday heat.
 *  - Geographic clustering per day (nearest-neighbour ordering) and 45-minute transfer buffers.
 *  - Every price is an estimate and labelled so in the UI.
 */
const SLOT_TIMES: Record<string, [string, string][]> = {
  morning: [["08:30", "10:30"], ["09:00", "11:00"]],
  afternoon: [["13:30", "15:30"], ["14:00", "16:00"]],
  evening: [["17:00", "19:00"], ["19:30", "21:00"]],
};

function kbFor(name: string): DestinationKB | null {
  const k = name.toLowerCase().trim();
  return KB[k] ?? KB[KB_ALIASES[k] ?? ""] ?? null;
}

function budgetTier(budget: string): 0 | 1 | 2 {
  const b = budget.toLowerCase();
  if (/cheap|budget|low|backpack/.test(b)) return 0;
  if (/lux|premium|high/.test(b)) return 2;
  const n = Number(b.replace(/[^\d]/g, ""));
  if (n && n < 15000) return 0;
  if (n && n > 60000) return 2;
  return 1;
}

function travelersCount(s: string): number {
  const n = parseInt(s, 10);
  if (n > 0) return n;
  if (/solo|just me/i.test(s)) return 1;
  if (/couple|two/i.test(s)) return 2;
  if (/family/i.test(s)) return 4;
  return 2;
}

function genericPois(place: Place, seed: number, vibe = "balanced"): Poi[] {
  const rnd = mulberry32(seed);
  const jitter = () => (rnd() - 0.5) * 0.04;
  const n = place.name;
  const cleanCity = n.split(/,|-|\|/)[0].trim().replace(/\s+(india|district|city)$/i, "");
  
  const isSpiritual = /spiritual|temple|pilgrim|faith|devotion/i.test(vibe);
  const isAdventure = /adventure|trek|nature|wildlife|outdoor/i.test(vibe);
  const isFoodie = /food|culinary|gourmet|eat/i.test(vibe);
  const isRelaxed = /relax|peace|leisure|chill/i.test(vibe);

  const tpl: [string, Poi["category"], Poi["slot"], Poi["crowd"], boolean, number, number, string][] = [
    [
      isSpiritual
        ? `${cleanCity} Historic Sanctum & Architectural Darshan`
        : isAdventure
        ? `${cleanCity} Morning Nature Ridge Trail & Sunrise Vista`
        : isFoodie
        ? `${cleanCity} Heritage Breakfast & Old Alley Food Walk`
        : isRelaxed
        ? `${cleanCity} Serene Waterfront Promenade & Lake View`
        : `${cleanCity} Historic Heritage Landmark Walk`,
      "culture",
      "morning",
      "moderate",
      true,
      120,
      isSpiritual ? 0 : 50,
      isSpiritual ? "Visit early during morning prayer hours" : "Start early before midday heat",
    ],
    [
      isFoodie
        ? `${cleanCity} Famous Spice Market & Artisan Street Food Tasting`
        : `${cleanCity} Regional Arts, Crafts & History Gallery`,
      isFoodie ? "food" : "culture",
      "morning",
      "low",
      false,
      90,
      150,
      "Explore regional treasures and exhibits",
    ],
    [
      isAdventure
        ? `${cleanCity} Panoramic Cliff Viewpoint & Valley Lookout`
        : isSpiritual
        ? `${cleanCity} Sacred River Ghats / Holy Temple Tank Walk`
        : `${cleanCity} Scenic Botanical Garden & Green Oasis`,
      "sightseeing",
      "afternoon",
      "low",
      true,
      90,
      50,
      "Golden hour views and calm photo opportunities",
    ],
    [
      `${cleanCity} Traditional Bazaars, Handicrafts & Local Delicacies`,
      "food",
      "evening",
      "peak",
      true,
      120,
      250,
      "Shop directly from local artisans and sample freshly prepared sweets",
    ],
    [
      isSpiritual
        ? `${cleanCity} Sunset River Aarti & Traditional Chanting`
        : isAdventure
        ? `${cleanCity} Sunset Mountain Overlook & Twilight Ridge`
        : `${cleanCity} Golden Hour Landmark Viewpoint`,
      isSpiritual ? "culture" : "sightseeing",
      "evening",
      "moderate",
      true,
      90,
      0,
      "Dusk twilight atmosphere is spectacular",
    ],
    [
      `Authentic Regional Cuisine Dinner in ${cleanCity}`,
      "food",
      "evening",
      "moderate",
      false,
      90,
      500,
      "Ask for the house specialty thali and regional sweets",
    ],
    [
      `${cleanCity} Countryside & Heritage Outskirts Excursion`,
      "sightseeing",
      "morning",
      "low",
      true,
      180,
      300,
      "Scenic countryside trail just outside the city center",
    ],
    [
      isSpiritual
        ? `${cleanCity} Classical Music & Devotional Choral Performance`
        : `${cleanCity} Traditional Folk Arts & Cultural Performance`,
      "culture",
      "evening",
      "low",
      false,
      90,
      250,
      "Experience local authentic folk music and traditions",
    ],
  ];

  return tpl.map(([name, category, slot, crowd, outdoor, minutes, cost, tip]) => ({
    name,
    category,
    slot,
    crowd,
    outdoor,
    minutes,
    cost,
    tip,
    booking: "walk-in",
    lat: place.lat + jitter(),
    lng: place.lng + jitter(),
  }));
}

function orderByProximity(pois: Poi[]): Poi[] {
  if (pois.length <= 2) return pois;
  const rest = [...pois];
  const out = [rest.shift()!];
  while (rest.length) {
    const last = out[out.length - 1];
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const d = (p.lat - last.lat) ** 2 + (p.lng - last.lng) ** 2; if (d < bd) { bd = d; bi = i; } });
    out.push(rest.splice(bi, 1)[0]);
  }
  return out;
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}

function addMinutesTo24h(start24: string, minutesToAdd: number): string {
  const [h, m] = start24.split(":").map(Number);
  const clampedMins = Math.max(60, Math.min(210, minutesToAdd || 120));
  const totalMins = h * 60 + m + clampedMins;
  const endH = Math.min(23, Math.floor(totalMins / 60));
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

const REGIONAL_DINING: Record<string, string[]> = {
  jaipur: [
    "Lunch: Dal Baati Churma & Gatte ki Sabzi at a heritage courtyard; Evening: Pyaaz Kachori & Ghewar at Rawat Mishthan",
    "Try authentic Laal Maas or Ker Sangri with Bajra Roti, followed by kulhad lassi near MI Road",
    "Savour Rajasthani royal thali with Mirchi Vada, Papad ki Sabzi, and saffron Jalebi",
  ],
  goa: [
    "Lunch: Goan Fish Curry Rice, Kokum Solkadhi & Rava Fried Chonak at a beach shack; Dessert: 7-layer Bebinca",
    "Try Portuguese-Goan Chicken Xacuti, Poi flatbread, and Prawn Balchão in a Fontainhas tavern",
    "Savour Goan Chorizo Pulao, Crab Xec Xec, and fresh tender coconut by the Arabian Sea",
  ],
  kerala: [
    "Lunch: Traditional 24-item Kerala Sadhya on banana leaf with Payasam; Evening: Appam with Vegetable/Fish Molee",
    "Try Malabar Parotta with Kerala Beef/Mushroom Roast and Karimeen Pollichathu (pearl spot fish in banana leaf)",
    "Breakfast: Puttu & Kadala Curry with fresh toddy-shop style coconut chutney and Nilgiri filter coffee",
  ],
  varanasi: [
    "Morning: Hot Kachori-Sabzi & Jalebi in Kachori Gali; Evening: Banarasi Tamatar Chaat, Palak Patta Chaat & winter Malaiyyo",
    "Try Thandai with saffron & pistachios near Godowlia, followed by traditional Banarasi Paan",
    "Savour Baati Chokha cooked over wood-coal and creamy Rabri in an earthen kulhad",
  ],
  delhi: [
    "Morning: Stuffed Paranthas at Paranthe Wali Gali & Nagori Halwa; Evening: Old Delhi Butter Chicken, Seekh Kebabs & Shahi Tukda",
    "Try Chole Bhature at Connaught Place, Daulat ki Chaat (winter), and Dahi Bhalla at Natraj",
    "Savour Pandara Road Dal Makhani & Garlic Naan or South Indian filter coffee at India Coffee House",
  ],
  mumbai: [
    "Morning: Bun Maska & Irani Chai at a heritage Irani cafe; Evening: Juhu/Girgaum Pav Bhaji, Vada Pav & Bombay Bhel Puri",
    "Try Britannia Berry Pulao, Bombil Fry (Bombay Duck) & Solkadhi at a classic Malvani seafood kitchen",
    "Savour Keema Pav,Baida Roti, and Mango Mastani after an evening walk along Marine Drive",
  ],
  agra: [
    "Morning: Crispy Bedai & Jalebi breakfast; Evening: Mughlai Galouti Kebab, Dum Biryani & Angoori Petha",
    "Try Mughal-era Murgh Musallam, Dal Mughlai, and Peshawari Naan overlooking the Taj precinct",
  ],
  udaipur: [
    "Lakeside dinner overlooking Lake Pichola: Mewari Dal Baati, Gatte ki Khichdi & Makki ki Raab",
    "Try Rajasthani Banjara curry, Kachori with pudina chutney, and rooftop kulhad masala chai",
  ],
  ladakh: [
    "Warm up with steaming Ladakhi Skyu (thumb-sized pasta stew), Tingmo steamed buns, and Butter Tea (Gur Gur Cha)",
    "Try Chhurpi yak-cheese momos, Thukpa noodle soup, and sea-buckthorn berry juice in Leh Old Town",
  ],
  rishikesh: [
    "Sattvic riverside brunch: Ayurvedic herbal kadha, millet pancakes, and Garhwali Kafuli & Chainsoo thali",
    "Try Chotiwala-style North Indian thali, fresh Ganga-view wood-fired bakehouse breads, and jaggery sweets",
  ],
  amritsar: [
    "Breakfast: Crisp tandoori Amritsari Kulcha drenched in white makkhan with spicy chole & tall peda lassi",
    "Try Langar Prasad at Golden Temple, followed by Lawrence Road Tikki, Phirni & Pinni",
  ],
  hampi: [
    "Try North Karnataka Jolada Rotti thali with Ennegai (stuffed brinjal), groundnut chutney powder & mango lassi",
    "Savour banana flower curry, South Indian filter coffee, and sunset snacks on Virupapur Gadde",
  ],
  ooty: [
    "Tea break: Freshly brewed Nilgiri Orange Pekoe tea with Ooty varkey biscuits and homemade dark chocolate fudge",
    "Try traditional Badaga Avarekkai curry with Tuppadakki (ghee rice) inside a heritage bungalow",
  ],
  srirangam: [
    "Morning: Authentic Kumbakonam degree filter coffee, Ghee Pongal, Medu Vada & Srirangam Temple Puliyodarai prasadam",
    "Try traditional Cauvery-delta banana leaf lunch with Rasam, Paruppu Usili, and warm Paal Payasam",
  ],
  madurai: [
    "Must-try: Fluffy Murugan Idli with 4 chutneys, Kari Dosa, and chilled Madurai Famous Jigarthanda",
    "Savour Chettinad pepper curry, Parotta, and Sukku Malli (dry ginger-coriander) coffee near Meenakshi Amman Koil",
  ],
  manali: [
    "Dinner: Pan-seared Himalayan Rainbow Trout in lemon-garlic butter and steamed Himachali Siddu with walnut chutney",
    "Try Kullu Dham festive platter (Sepu Vadi, Rajma Madra & Meetha Bhaat) with hot apple cider",
  ],
  shimla: [
    "Try traditional Himachali Chana Madra, Babru (stuffed black gram flatbread), and heritage Mall Road bakery pastries",
    "Warm up with Pahadi Rajma-Chawal, Kangri Dham, and ginger-honey Himalayan tea",
  ],
  darjeeling: [
    "Breakfast at Keventer's/Glenary's overlooking Kanchenjunga; Evening: Steaming Tibetan Thukpa, Шаphaley & First-Flush tea",
    "Try traditional Nepali Sel Roti, Churpee soup, and warm cinnamon rolls on Chowrasta Mall",
  ],
  ayodhya: [
    "Savour pure vegetarian Awadhi Sattvic Thali, Hanuman Garhi Besan Laddu prasad, and creamy Rabri-Jalebi",
    "Morning: Hot Bedmi Puri with Aloo Sabzi and kulhad kesar doodh near Ram Path",
  ],
  pondicherry: [
    "Breakfast: Fresh French butter croissants & café au lait in White Town; Dinner: Creole Prawn Curry & wood-fired pizza",
    "Try Franco-Tamil Meen Kuzhambu, Coq au Vin, and artisanal gelato along Goubert Avenue",
  ],
  andaman: [
    "Dinner: Freshly grilled Andaman Red Snapper, Tiger Prawns in coconut milk, and tropical mango salad",
    "Try island-style crab masala, coconut water straight from the palm, and banana pancakes by Havelock beach",
  ],
  coorg: [
    "Dinner: Authentic Kodava Pandi Curry with Kachampuli vinegar, Kadambuttu (steamed rice balls) & Akki Rotti",
    "Try Noolputtu (string hoppers) withbella coffee (jaggery estate filter coffee) and bamboo shoot fry",
  ],
  mysuru: [
    "Morning: Original Vinayaka Mylari fluffy butter dosa on banana leaf; Sweet: Warm ghee-dripping Mysore Pak at Guru Sweet Mart",
    "Try Karnataka Bisi Bele Bath, Maddur Vada, and Mysore Masala Dosa with red garlic chutney",
  ],
};

function getDiningForCityDay(cityName: string, dayIdx: number): string {
  const key = cityName.toLowerCase().trim();
  const resolved = KB_ALIASES[key] ?? key;
  const list = REGIONAL_DINING[resolved];
  if (list && list.length > 0) {
    return list[dayIdx % list.length];
  }
  return `Sample ${cityName}'s signature regional thali for lunch and explore popular local evening street-food hubs & sweet shops.`;
}

function buildRichPoiDescription(p: Poi, cityName: string, slot: string): string {
  const cleanCity = cityName.split(/,|-|\|/)[0].trim();
  const durHrs = p.minutes >= 120 ? `${(p.minutes / 60).toFixed(p.minutes % 60 === 0 ? 0 : 1)} hours` : `${p.minutes} minutes`;
  const catContext =
    p.category === "culture"
      ? `One of ${cleanCity}'s most revered cultural and architectural heritage landmarks.`
      : p.category === "food"
      ? `An authentic culinary and local bazaar experience in the heart of ${cleanCity}.`
      : p.category === "leisure"
      ? `A signature scenic leisure experience offering a relaxed pace in ${cleanCity}.`
      : `A flagship sightseeing highlight showcasing ${cleanCity}'s iconic landscapes and history.`;

  const slotReason =
    slot === "morning"
      ? `Scheduled in the morning window for pleasant temperatures, soft photography light, and shorter entry queues.`
      : slot === "evening"
      ? `Timed for the golden-hour / twilight atmosphere when the precinct is at its most vibrant.`
      : `Planned for the afternoon block with a comfortable pace and nearby refreshment stops.`;

  const costNote = p.cost > 0 ? `Typical entry/experience tariff is ~₹${p.cost.toLocaleString("en-IN")}/person` : `Entry is free of charge`;
  return `${catContext} Plan roughly ${durHrs} on site. Insider note: ${p.tip}. ${slotReason} (${costNote}; ${p.booking}).`;
}

function buildDistinctOffPeakTip(p: Poi, slot: string): string {
  if (p.booking === "30+ days required") {
    return `High-demand ticketed attraction — reserve your timed slot 30+ days ahead; ${p.tip.toLowerCase()}.`;
  }
  if (p.booking === "3-7 days advance") {
    return `Pre-book online 3–7 days prior to skip box-office queues; ${p.tip.toLowerCase()}.`;
  }
  if (p.crowd === "peak" && slot === "morning") {
    return `Placed in the early opening slot to beat peak tour-bus crowds — ${p.tip.toLowerCase()}.`;
  }
  return p.tip;
}

function getDestinationPois(
  stopName: string,
  place: Place | null,
  kb: DestinationKB | null,
  seed: number,
  vibe: string,
  neededCount: number
): Poi[] {
  const basePois = kb ? [...kb.pois] : place ? genericPois(place, seed, vibe) : [];
  if (basePois.length >= neededCount) return basePois;

  const cleanCity = stopName.split(/,|-|\|/)[0].trim().replace(/\s+(india|district|city)$/i, "");
  const extraTemplates: [string, Poi["category"], Poi["slot"], Poi["crowd"], boolean, number, number, string][] = [
    [`${cleanCity} Traditional Artisan Handicrafts & Weaving Workshop`, "culture", "morning", "low", false, 100, 200, "Observe master artisans and handcraft regional souvenirs"],
    [`${cleanCity} Scenic Nature Trail & Forest Flora Walk`, "sightseeing", "morning", "low", true, 120, 50, "Fresh morning breeze and quiet nature paths"],
    [`${cleanCity} Historic Stepwell & Ancient Architecture Wonder`, "sightseeing", "afternoon", "moderate", true, 75, 100, "Architectural marvel with geometric cool stone corridors"],
    [`${cleanCity} Regional Culinary Masterclass & Spice Tasting`, "food", "afternoon", "low", false, 120, 600, "Learn traditional seasoning secrets from local chefs"],
    [`${cleanCity} Sunset Riverfront / Lakeside Promenade & Boat Drift`, "leisure", "evening", "moderate", true, 90, 350, "Peaceful sunset atmosphere as evening lanterns light up"],
    [`${cleanCity} Authentic Regional Sweets & Night Street Food Tour`, "food", "evening", "peak", false, 90, 300, "Sample freshly fried savouries and regional warm desserts"],
    [`${cleanCity} Rural Countryside Excursion & Organic Village Farm`, "sightseeing", "morning", "low", true, 180, 400, "Peaceful countryside day trip away from urban bustle"],
    [`${cleanCity} Classical Heritage Music & Folk Dance Performance`, "culture", "evening", "moderate", false, 90, 250, "Evening cultural showcase of traditional regional dance"],
    [`${cleanCity} Royal Archives & Heritage Museum Exploration`, "culture", "morning", "low", false, 100, 250, "Rare historical artefacts, royal weaponry, and paintings"],
    [`${cleanCity} Panoramic Hilltop Sanctuary & Sunset Viewpoint`, "sightseeing", "evening", "moderate", true, 90, 50, "Stunning panoramic vistas over the entire valley"],
    [`${cleanCity} Herbal Garden & Traditional Ayurvedic Wellness Walk`, "leisure", "afternoon", "low", true, 80, 150, "Aromatic medicinal plants and restorative tranquil paths"],
    [`${cleanCity} Twilight Starlight Observatory & Rooftop Gathering`, "leisure", "evening", "low", true, 90, 200, "Stargazing and relaxing terrace conversations under clear skies"],
  ];

  const rnd = mulberry32(seed + 99);
  const jitter = () => (rnd() - 0.5) * 0.05;
  const lat = place?.lat ?? 20.0;
  const lng = place?.lng ?? 78.0;

  for (const [name, cat, slot, crowd, outdoor, mins, cost, tip] of extraTemplates) {
    if (basePois.length >= neededCount) break;
    basePois.push({
      name,
      category: cat,
      slot,
      crowd,
      outdoor,
      minutes: mins,
      cost,
      tip,
      booking: "walk-in",
      lat: lat + jitter(),
      lng: lng + jitter(),
    });
  }

  return basePois;
}

function buildArrivalTravelActivities(
  originName: string,
  destName: string,
  hotelName: string,
  mode: string,
  place: Place | null
): Activity[] {
  const coords = place ? { lat: place.lat, lng: place.lng } : { lat: 0, lng: 0 };
  return [
    {
      id: "act-1-1",
      title: `Morning Transit: ${originName} → ${destName}`,
      place_name: `${originName} to ${destName} Route`,
      description: `Board your scheduled ${mode.toLowerCase()} departure from ${originName}. Enjoy the scenic route as you travel toward ${destName}.`,
      details: "Check-in or arrive at departure terminal at least 60 minutes prior. Keep digital tickets and ID ready.",
      category: "sightseeing",
      locationName: `${originName} Transit Hub`,
      timeSlot: "08:00 AM - 12:30 PM",
      time: "08:00 AM - 12:30 PM",
      startTime: "08:00",
      endTime: "12:30",
      crowdLevel: "moderate",
      offPeakTip: "Carry water and light snacks for the journey.",
      bookingDeadline: "3-7 days advance",
      ticket_price: "Included in transport plan",
      estimatedCost: { amount: 0, currency: "₹" },
      coordinates: coords,
      geo_coordinates: coords,
      logistics: "Departure transit leg",
      prediction: { delayRiskScore: 18, predictedCrowdLevel: "moderate", weatherSensitivity: "indoor", estimatedTransitMinutes: 120 },
      isProtectedByShield: true,
      image_query: `${originName} to ${destName} travel`,
    },
    {
      id: "act-1-2",
      title: `Hotel Check-in & Settle In (${hotelName})`,
      place_name: hotelName,
      description: `Arrive at your accommodation in ${destName}. Check in, unpack, refresh and get familiar with the neighbourhood.`,
      details: "Standard check-in time is 1:00 PM – 2:00 PM. Front desk can assist with local maps and orientation.",
      category: "leisure",
      locationName: hotelName,
      timeSlot: "01:30 PM - 03:30 PM",
      time: "01:30 PM - 03:30 PM",
      startTime: "13:30",
      endTime: "15:30",
      crowdLevel: "low",
      offPeakTip: "Relax after your journey; early check-in subject to room readiness.",
      bookingDeadline: "walk-in",
      ticket_price: "Free",
      estimatedCost: { amount: 0, currency: "₹" },
      coordinates: coords,
      geo_coordinates: coords,
      logistics: "Arrival hotel check-in",
      prediction: { delayRiskScore: 10, predictedCrowdLevel: "low", weatherSensitivity: "indoor", estimatedTransitMinutes: 20 },
      isProtectedByShield: true,
      image_query: `${hotelName} ${destName}`,
    },
    {
      id: "act-1-3",
      title: "Evening Orientation Promenade & Welcome Dinner",
      place_name: `${destName} Central Promenade`,
      description: `Unwind with a relaxed sunset stroll through ${destName}'s vibrant streets, followed by a welcome dinner sampling authentic local regional specialties.`,
      details: "Try the signature regional thali or fresh delicacies recommended by locals.",
      category: "food",
      locationName: `${destName} City Centre`,
      timeSlot: "06:00 PM - 08:30 PM",
      time: "06:00 PM - 08:30 PM",
      startTime: "18:00",
      endTime: "20:30",
      crowdLevel: "moderate",
      offPeakTip: "Head out around 6 PM to catch the twilight atmosphere.",
      bookingDeadline: "walk-in",
      ticket_price: "₹450",
      estimatedCost: { amount: 450, currency: "₹" },
      coordinates: coords,
      geo_coordinates: coords,
      logistics: "45-minute transfer buffer included",
      prediction: { delayRiskScore: 12, predictedCrowdLevel: "moderate", weatherSensitivity: "outdoor_high", estimatedTransitMinutes: 25 },
      isProtectedByShield: true,
      image_query: `${destName} traditional cuisine dinner`,
    },
  ];
}

function buildDepartureTravelActivities(
  originName: string,
  destName: string,
  hotelName: string,
  mode: string,
  place: Place | null,
  dayNo: number
): Activity[] {
  const coords = place ? { lat: place.lat, lng: place.lng } : { lat: 0, lng: 0 };
  return [
    {
      id: `act-${dayNo}-1`,
      title: "Morning Souvenirs & Traditional Bazaar Walk",
      place_name: `${destName} Local Heritage Market`,
      description: `Final morning to explore local bazaars. Pick up authentic handicrafts, regional sweets, spices, and souvenirs before departure.`,
      details: "Support local artisans; cash and UPI are widely accepted.",
      category: "food",
      locationName: `${destName} Market`,
      timeSlot: "09:00 AM - 11:00 AM",
      time: "09:00 AM - 11:00 AM",
      startTime: "09:00",
      endTime: "11:00",
      crowdLevel: "low",
      offPeakTip: "Mornings are best to avoid the afternoon shopping rush.",
      bookingDeadline: "walk-in",
      ticket_price: "Free",
      estimatedCost: { amount: 0, currency: "₹" },
      coordinates: coords,
      geo_coordinates: coords,
      logistics: "Start of final day",
      prediction: { delayRiskScore: 10, predictedCrowdLevel: "low", weatherSensitivity: "outdoor_high", estimatedTransitMinutes: 20 },
      isProtectedByShield: true,
      image_query: `${destName} local handicraft market`,
    },
    {
      id: `act-${dayNo}-2`,
      title: "Hotel Check-out & Station/Airport Transfer",
      place_name: hotelName,
      description: `Wrap up packing, complete check-out formalities at the hotel reception, and transfer to ${destName} departure terminal.`,
      details: "Standard check-out is 11:00 AM – 12:00 PM. Allow ample transit time for airport/station security.",
      category: "leisure",
      locationName: hotelName,
      timeSlot: "11:30 AM - 01:00 PM",
      time: "11:30 AM - 01:00 PM",
      startTime: "11:30",
      endTime: "13:00",
      crowdLevel: "moderate",
      offPeakTip: "Pre-book airport cab or arrange hotel drop-off.",
      bookingDeadline: "walk-in",
      ticket_price: "Free",
      estimatedCost: { amount: 0, currency: "₹" },
      coordinates: coords,
      geo_coordinates: coords,
      logistics: "45-minute transfer buffer included",
      prediction: { delayRiskScore: 15, predictedCrowdLevel: "moderate", weatherSensitivity: "indoor", estimatedTransitMinutes: 35 },
      isProtectedByShield: true,
      image_query: `${hotelName} checkout transfer`,
    },
    {
      id: `act-${dayNo}-3`,
      title: `Return Transit: ${destName} → ${originName}`,
      place_name: `${destName} to ${originName} Route`,
      description: `Board your scheduled return service back to ${originName}. Reflect on the wonderful memories and experiences from your journey.`,
      details: "Keep boarding pass and baggage tags handy until arrival home.",
      category: "sightseeing",
      locationName: `${destName} Departure Terminal`,
      timeSlot: "02:00 PM - 07:00 PM",
      time: "02:00 PM - 07:00 PM",
      startTime: "14:00",
      endTime: "19:00",
      crowdLevel: "moderate",
      offPeakTip: "Charge power banks before boarding.",
      bookingDeadline: "3-7 days advance",
      ticket_price: "Included in transport plan",
      estimatedCost: { amount: 0, currency: "₹" },
      coordinates: coords,
      geo_coordinates: coords,
      logistics: "Final return leg",
      prediction: { delayRiskScore: 18, predictedCrowdLevel: "moderate", weatherSensitivity: "indoor", estimatedTransitMinutes: 120 },
      isProtectedByShield: true,
      image_query: `${destName} to ${originName} return journey`,
    },
  ];
}

export function planTripLocally(input: TripData): GeneratedTrip {
  // Parse stops and extract optional explicit per-stop days e.g. "Delhi (2 days)" or "Jaipur: 3"
  const rawStops = input.destination.split("|").map((d) => d.trim()).filter(Boolean);
  const parsedStops = rawStops.map((raw) => {
    const match = raw.match(/^(.*?)(?::\s*(\d+)|\s*\(\s*(\d+)\s*(?:days?|d)?\s*\)|\s*-\s*(\d+)\s*(?:days?|d)?|\s+(\d+)\s*(?:days?|d))$/i);
    if (match) {
      const cleanName = match[1].trim();
      const explicitDays = parseInt(match[2] || match[3] || match[4] || match[5], 10);
      return {
        raw,
        cleanName: cleanName || raw,
        explicitDays: !isNaN(explicitDays) && explicitDays > 0 ? explicitDays : undefined,
      };
    }
    return {
      raw,
      cleanName: raw,
      explicitDays: undefined,
    };
  });

  const stops = parsedStops.map((p) => p.cleanName);
  const hasExplicitStopDays = parsedStops.some((p) => typeof p.explicitDays === "number");
  const explicitDaysSum = parsedStops.reduce((sum, p) => sum + (p.explicitDays || 0), 0);

  const rawDays = parseInt(input.days, 10) || (hasExplicitStopDays ? explicitDaysSum : 3);
  const requestedDays = Math.max(1, Math.min(21, rawDays));
  const pax = travelersCount(input.travelers || "2");
  const tier = budgetTier(input.budget || "Moderate");
  const origin = findPlace(input.origin || "") ?? null;
  const originName = origin?.name || input.origin || "Origin";
  const seed = fnv1a(`${input.destination}|${input.days}|${input.vibe}`);

  const rawBudgetNum = Number(String(input.budget || "").replace(/[^\d]/g, ""));
  const isBudgetRestricted = tier === 0 || (rawBudgetNum > 0 && rawBudgetNum <= 18000);

  // Travel Days Filter Logic:
  // - excludeTravel: user picked pure destination stay (e.g. 11 days at destination + 2 travel days = 13 total)
  // - isExplicitInclude: user explicitly picked including travel (e.g. 11 days total: Day 1 travel, Day 11 return, 9 days destination)
  // - undefined: legacy behaviour (total days = requestedDays, all destination days)
  const excludeTravel = input.includeTravelDays === false || input.includeTravelDays === "no" || input.includeTravelDays === "excluded";
  const isExplicitInclude = input.includeTravelDays === true || input.includeTravelDays === "yes" || input.includeTravelDays === "included";
  const hasTravelDaysSplit = excludeTravel || (isExplicitInclude && requestedDays >= 3);

  const totalDays = excludeTravel ? requestedDays + 2 : requestedDays;
  const destStayDays = excludeTravel
    ? requestedDays
    : isExplicitInclude && requestedDays >= 3
    ? Math.max(1, requestedDays - 2)
    : requestedDays;

  // Allocate days per stop:
  // If stops have explicit days specified, allocate them accurately.
  // If some stops have explicit days and others don't, allocate the remainder.
  const perStop = parsedStops.map((s) => {
    let allocatedDays = s.explicitDays;
    if (allocatedDays === undefined) {
      const unassignedStops = parsedStops.filter((p) => p.explicitDays === undefined);
      const remainingDays = Math.max(unassignedStops.length, destStayDays - explicitDaysSum);
      const unassignedIdx = unassignedStops.findIndex((p) => p === s);
      allocatedDays = Math.floor(remainingDays / unassignedStops.length) + (unassignedIdx < remainingDays % unassignedStops.length ? 1 : 0);
    }
    const cleanCity = s.cleanName;
    return {
      name: cleanCity,
      place: findPlace(cleanCity),
      kb: kbFor(cleanCity),
      days: Math.max(1, allocatedDays),
    };
  });

  const rawStartDate = input.startDate?.trim();
  const validStartDate = rawStartDate && /^\d{4}-\d{2}-\d{2}$/.test(rawStartDate) ? rawStartDate : undefined;

  const formatDateForDay = (offsetDays: number): string | undefined => {
    if (!validStartDate) return undefined;
    const [y, m, d] = validStartDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
    return dt.toLocaleDateString("en-IN", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const startDateIso = validStartDate;
  const endDateIso = validStartDate
    ? (() => {
        const [y, m, d] = validStartDate.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d + totalDays - 1)).toISOString().slice(0, 10);
      })()
    : undefined;

  const itinerary: DayPlan[] = [];
  const hotels: Hotel[] = [];
  let dayNo = 1;
  let activitiesCost = 0;
  let stayCost = 0;
  let foodCost = 0;
  let localCost = 0;

  // Resolve Real Hotels for each stop
  for (const stop of perStop) {
    const realHotels = resolveRealHotels(stop.name, tier, pax, rawBudgetNum);
    const primary = realHotels[0];
    const rooms = Math.ceil(pax / 2);
    const nightly = Math.round((primary.nightlyMin + primary.nightlyMax) / 2);
    const stopNights = Math.max(1, stop.days);
    stayCost += nightly * rooms * stopNights;

    for (const rh of realHotels) {
      hotels.push({
        name: rh.name,
        address: rh.address,
        price: rh.price,
        image_query: rh.image_query,
        image_url: rh.image_url,
        rating: rh.rating,
        description: rh.description,
        amenities: rh.amenities,
        tier: rh.tier,
        geo_coordinates: stop.place ? { lat: stop.place.lat, lng: stop.place.lng } : undefined,
        city: rh.city || stop.name,
        bookingUrl: rh.bookingUrl,
        bookingUrls: rh.bookingUrls,
      });
    }

    const food = stop.kb?.dailyFood ?? [900, 2000];
    const tr = stop.kb?.localTransitPerDay ?? [600, 1500];
    foodCost += food[tier === 2 ? 1 : 0] * pax * stop.days;
    localCost += tr[tier === 2 ? 1 : 0] * stop.days;
  }

  const primaryHotelName = hotels[0]?.name || "Central Hotel";
  const preferredMode = input.travelMode || "Flight";

  // If travel days are split: Day 1 is Departure & Arrival Travel
  if (hasTravelDaysSplit) {
    const firstPlace = perStop[0]?.place ?? null;
    const arrActs = buildArrivalTravelActivities(originName, stops[0], primaryHotelName, preferredMode, firstPlace);
    itinerary.push({
      day: 1,
      theme: `Departure from ${originName} & Travel to ${stops[0]}`,
      date: formatDateForDay(0),
      pacingRating: "light",
      dailyCostEstimate: "~₹850/person (transit refreshments, local transfer & welcome dinner)",
      diningSuggestion: getDiningForCityDay(stops[0], 0),
      proTip: `Keep digital tickets and government ID ready; confirm ${primaryHotelName} check-in time prior to arrival.`,
      totalDistanceKm: 12.0,
      activities: arrActs,
    });
    activitiesCost += 450 * pax; // dinner cost
    dayNo = 2;
  }

  // Generate Destination Stay Days
  let stopIndex = 0;
  for (const stop of perStop) {
    const place = stop.place;
    const kb = stop.kb;
    const perDay = /relax|chill/i.test(input.vibe || "") ? 2 : 3;
    const neededPois = perDay * Math.max(1, stop.days);
    const pois = getDestinationPois(stop.name, place, kb, seed + stopIndex * 31, input.vibe, neededPois);

    const vibeOutdoor = /adventure|nature|beach/i.test(input.vibe || "");
    const vibeCulture = /culture|heritage|spiritual|history/i.test(input.vibe || "");
    const ranked = [...pois].sort((a, b) => {
      const s = (p: Poi) => (vibeOutdoor && p.outdoor ? 2 : 0) + (vibeCulture && p.category === "culture" ? 2 : 0) + (p.crowd === "peak" ? 1 : 0);
      return s(b) - s(a);
    });
    const chosen = ranked.slice(0, Math.min(ranked.length, neededPois));

    for (let d = 0; d < stop.days; d++) {
      const isTransitionDay = stopIndex > 0 && d === 0;
      const dayPois = orderByProximity(chosen.slice(d * perDay, d * perDay + (isTransitionDay ? Math.max(1, perDay - 1) : perDay)));
      // slot assignment: peak-crowd & outdoor -> morning, evening items -> evening
      const slots: Record<string, Poi[]> = { morning: [], afternoon: [], evening: [] };
      for (const p of dayPois) {
        let slot: string = p.slot === "any" ? (isTransitionDay ? "afternoon" : "afternoon") : p.slot;
        if (isTransitionDay && slot === "morning") slot = "afternoon";
        if (p.crowd === "peak" && p.slot !== "evening" && !isTransitionDay) slot = "morning";
        if (slots[slot].length >= 1) slot = ["afternoon", "evening", "morning"].find((s) => slots[s].length === 0) ?? slot;
        slots[slot].push(p);
      }
      const acts: Activity[] = [];
      let k = 0;
      let dayTicketsTotal = 0;
      let dayDistanceKm = 0;
      let prevCoords: { lat: number; lng: number } | null = place ? { lat: place.lat, lng: place.lng } : null;

      // If this is a transition day between multi-destination stops, prepend intercity travel
      if (isTransitionDay) {
        const prevStop = perStop[stopIndex - 1];
        const prevPlace = prevStop.place;
        const currPlace = stop.place;
        const distKm = prevPlace && currPlace ? Math.round(haversineKm(prevPlace, currPlace)) : 260;
        const transitCostMin = Math.round(distKm * 1.5 * pax);
        const transitCostMax = Math.round(distKm * 3.5 * pax);
        acts.push({
          id: `act-${dayNo}-intercity`,
          title: `Intercity Scenic Journey: ${prevStop.name} → ${stop.name}`,
          place_name: `Intercity Route (${prevStop.name} to ${stop.name})`,
          description: `Morning journey from ${prevStop.name} to ${stop.name} (~${distKm} km). Enjoy the changing scenery by express train (e.g. Vande Bharat / Superfast Express) or intercity highway cab. Check into your hotel in ${stop.name} and refresh before afternoon sightseeing.`,
          details: `Direct transit between ${prevStop.name} and ${stop.name}.`,
          category: "leisure",
          locationName: `${stop.name} Arrival Hub`,
          timeSlot: "08:30 AM - 12:00 PM",
          time: "08:30 AM - 12:00 PM",
          startTime: "08:30",
          endTime: "12:00",
          crowdLevel: "moderate",
          offPeakTip: `Depart early from ${prevStop.name} to make the most of your first afternoon in ${stop.name}.`,
          bookingDeadline: "3-7 days advance",
          ticket_price: `₹${transitCostMin.toLocaleString("en-IN")}–₹${transitCostMax.toLocaleString("en-IN")}`,
          estimatedCost: { amount: Math.round((transitCostMin + transitCostMax) / 2), currency: "₹" },
          coordinates: currPlace ? { lat: currPlace.lat, lng: currPlace.lng } : { lat: 0, lng: 0 },
          geo_coordinates: currPlace ? { lat: currPlace.lat, lng: currPlace.lng } : undefined,
          logistics: "Intercity connection transfer",
          prediction: { delayRiskScore: 16, predictedCrowdLevel: "moderate", weatherSensitivity: "indoor", estimatedTransitMinutes: 180 },
          isProtectedByShield: true,
          image_query: `${prevStop.name} to ${stop.name} travel`,
        });
        activitiesCost += Math.round((transitCostMin + transitCostMax) / 2);
      }

      for (const slot of ["morning", "afternoon", "evening"] as const) {
        for (const p of slots[slot]) {
          const [st] = SLOT_TIMES[slot][Math.min(k % 2, 1)];
          const en = addMinutesTo24h(st, p.minutes);
          const crowdNow = p.crowd === "peak" && slot === "morning" ? "moderate" : p.crowd;

          // Compute real road distance & transit duration from previous stop or hotel
          let roadDistKm = 2.5;
          if (prevCoords && (prevCoords.lat !== 0 || prevCoords.lng !== 0)) {
            const R = 6371;
            const dLat = ((p.lat - prevCoords.lat) * Math.PI) / 180;
            const dLon = ((p.lng - prevCoords.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((prevCoords.lat * Math.PI) / 180) *
                Math.cos((p.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
            const straightKm = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
            roadDistKm = Math.max(0.6, Math.round(straightKm * 1.28 * 10) / 10);
          }
          dayDistanceKm += roadDistKm;
          const transitMins = roadDistKm <= 1.4 ? Math.max(8, Math.round(roadDistKm * 11)) : Math.max(12, Math.round((roadDistKm / 22) * 60 + 6));
          const transitModeLabel = roadDistKm <= 1.4 ? "scenic walk" : roadDistKm <= 7 ? "auto-rickshaw / local cab" : "inter-zone cab / metro";
          const logisticsStr =
            k === 0
              ? `Depart hotel (${primaryHotelName}) • ~${roadDistKm} km (${transitMins} min via ${transitModeLabel})`
              : `~${roadDistKm} km from previous stop (${transitMins} min via ${transitModeLabel}) • 45m buffer included`;

          const richDesc = buildRichPoiDescription(p, stop.name, slot);
          const distinctTip = buildDistinctOffPeakTip(p, slot);

          acts.push({
            id: `act-${dayNo}-${++k}`,
            title: p.name,
            place_name: p.name,
            description: richDesc,
            details: richDesc,
            category: p.category,
            locationName: p.name,
            timeSlot: `${fmt12(st)} - ${fmt12(en)}`,
            time: `${fmt12(st)} - ${fmt12(en)}`,
            startTime: st,
            endTime: en,
            crowdLevel: crowdNow,
            offPeakTip: distinctTip,
            bookingDeadline: p.booking,
            ticket_price: p.cost ? `₹${p.cost.toLocaleString("en-IN")}` : "Free",
            estimatedCost: { amount: p.cost, currency: "₹" },
            coordinates: { lat: p.lat, lng: p.lng },
            geo_coordinates: { lat: p.lat, lng: p.lng },
            logistics: logisticsStr,
            prediction: {
              delayRiskScore: p.outdoor ? 28 : 12,
              predictedCrowdLevel: crowdNow,
              weatherSensitivity: p.outdoor ? "outdoor_high" : "indoor",
              estimatedTransitMinutes: transitMins,
            },
            isProtectedByShield: true,
            image_query: `${p.name} ${stop.name}`,
          });
          dayTicketsTotal += p.cost;
          activitiesCost += p.cost * pax;
          prevCoords = { lat: p.lat, lng: p.lng };
        }
      }
      if (acts.length === 0) {
        acts.push({
          id: `act-${dayNo}-1`,
          title: `Explore ${stop.name} at your own pace`,
          description: "Flexible day — the agent keeps monitoring local conditions.",
          category: "leisure",
          locationName: stop.name,
          timeSlot: "10:00 AM - 1:00 PM",
          startTime: "10:00",
          endTime: "13:00",
          coordinates: place ? { lat: place.lat, lng: place.lng } : { lat: 0, lng: 0 },
        });
      }
      const dayFoodPerPerson = (kb?.dailyFood ?? [900, 2000])[tier === 2 ? 1 : 0];
      const dayTransitPerPerson = Math.round(((kb?.localTransitPerDay ?? [600, 1500])[tier === 2 ? 1 : 0]) / Math.max(1, pax));
      const estDayPerPerson = dayTicketsTotal + dayFoodPerPerson + dayTransitPerPerson;

      const hasPrebook = acts.some((a) => a.bookingDeadline && a.bookingDeadline !== "walk-in");
      const hasTempleOrCulture = acts.some((a) => /temple|mandir|mosque|church|shrine|monastery|gurdwara|palace|dargah/i.test(a.title));
      const dayProTip = hasPrebook
        ? `Carry digital vouchers & govt photo ID for pre-booked attractions (${acts.filter((a) => a.bookingDeadline !== "walk-in").map((a) => a.title).join(", ")}).`
        : hasTempleOrCulture
        ? `Modest traditional attire (covered shoulders & knees) recommended for heritage sanctums; slip-on footwear makes shoe-deposit counters effortless.`
        : `Start by ${acts[0]?.startTime || "08:30"} AM to stay ahead of city traffic and enjoy the best morning light.`;

      const highlightNames = acts
        .slice(0, 2)
        .map((a) => a.title.split("(")[0].trim())
        .join(" & ");
      const dayTheme = isTransitionDay
        ? `Journey to ${stop.name} & Afternoon Highlights${highlightNames ? ` — ${highlightNames}` : ""}`
        : !hasTravelDaysSplit && d === 0 && stopIndex === 0
        ? `Arrive & discover ${stop.name}${highlightNames ? ` — ${highlightNames}` : ""}`
        : `${stop.name} ${acts.some((a) => a.category === "culture") ? "Heritage & Culture" : "Scenic & Local Trail"}${highlightNames ? ` — ${highlightNames}` : ""}`;
      itinerary.push({
        day: dayNo,
        theme: dayTheme,
        date: formatDateForDay(dayNo - 1),
        pacingRating: acts.length >= 3 ? "balanced" : "light",
        dailyCostEstimate: `~₹${estDayPerPerson.toLocaleString("en-IN")}/person (tickets, meals & local transit)`,
        diningSuggestion: getDiningForCityDay(stop.name, d),
        proTip: dayProTip,
        totalDistanceKm: Math.round(dayDistanceKm * 10) / 10,
        activities: acts,
      });
      dayNo++;
    }
    stopIndex++;
  }

  // If travel days are split: Final Day is Return Travel & Departure
  if (hasTravelDaysSplit) {
    const lastStop = perStop[perStop.length - 1];
    const lastPlace = lastStop?.place ?? null;
    const depActs = buildDepartureTravelActivities(originName, lastStop?.name ?? stops[0], primaryHotelName, preferredMode, lastPlace, dayNo);
    itinerary.push({
      day: dayNo,
      theme: `Return Journey & Farewell to ${lastStop?.name ?? stops[0]}`,
      date: formatDateForDay(dayNo - 1),
      pacingRating: "light",
      dailyCostEstimate: "~₹650/person (souvenirs, airport/station snacks & transfer)",
      diningSuggestion: `Pick up packed regional sweets & namkeen from ${lastStop?.name ?? stops[0]}'s main bazaar for the journey home.`,
      proTip: "Complete hotel check-out by 11:30 AM and keep a 90-minute buffer before scheduled train/flight boarding.",
      totalDistanceKm: 14.5,
      activities: depActs,
    });
  }

  const transportation_plan: TransportationStep[] = [];
  let transportCost = 0;
  let prev: Place | null = origin;
  for (const stop of perStop) {
    if (stop.place && prev && prev.id !== stop.place.id) {
      const rawAlts = findAlternatives({ origin: prev, destination: stop.place, travelers: pax }).filter((a) => a.mode !== "wait");
      
      let best = rawAlts[0];
      if (rawAlts.length > 1) {
        if (isBudgetRestricted) {
          // For budget travelers or budgets <= 18k, prioritize Train or Bus over costly flights
          const nonFlight = rawAlts.filter((a) => a.mode !== "flight");
          if (nonFlight.length > 0) {
            best = nonFlight[0];
          }
        } else if (rawBudgetNum > 0) {
          const withinBudget = rawAlts.filter((a) => a.costInr[0] <= rawBudgetNum * 0.40);
          if (withinBudget.length > 0) {
            best = withinBudget[0];
          }
        }
      }

      if (best) {
        const fromPlace = prev;
        const toPlace = stop.place;
        const totalDist = haversineKm(fromPlace, toPlace);
        const hubInfo = findAirportHub(fromPlace);

        if (best.mode === "flight") {
          // 1. Feeder Leg if starting from a feeder city / secondary town without its own commercial airport hub
          if (hubInfo && hubInfo.isRemoteHub) {
            const isAmravatiToNagpur =
              fromPlace.name.toLowerCase().includes("amravati") &&
              hubInfo.hubPlace.name.toLowerCase().includes("nagpur");
            const feederDist = isAmravatiToNagpur ? 155 : Math.max(20, Math.round(hubInfo.distanceKm * 1.1)); // approx road/rail km
            const trainMin = Math.round(feederDist * 0.9 * pax);
            const trainMax = Math.round(feederDist * 2.8 * pax);
            const busMin = Math.round(feederDist * 1.4 * pax);
            const busMax = Math.round(feederDist * 2.4 * pax);
            const cabMin = Math.round(feederDist * 14 * Math.ceil(pax / 4));
            const cabMax = Math.round(feederDist * 18 * Math.ceil(pax / 4));

            const feederDetails = isAmravatiToNagpur
              ? `Feeder Leg 1: Amravati → Nagpur Airport Hub (~155 km). Available travel options:\n• Train: Direct daily services (AMI / Badnera Junction to Nagpur NGP, ~2.5–3.2h, ₹120–₹550/pax for 2S/SL/3AC).\n• Bus: MSRTC Shivshahi AC & private coaches via Hindu Hrudaysamrat Balasaheb Thackeray Maharashtra Samruddhi Mahamarg / NH 53 (~3–3.5h, ₹240–₹420/pax).\n• Taxi/Cab: Door-to-terminal highway cab direct to Dr. Babasaheb Ambedkar International Airport (NAG) (~2.2h, ₹2,400–₹3,200/vehicle).`
              : `Feeder Leg 1: ${fromPlace.name} → ${hubInfo.hubPlace.name} (${hubInfo.iataCode} Airport Hub, ~${feederDist} km). Available travel options:\n• Train / Rail: Regional express connecting ${fromPlace.name} to ${hubInfo.hubPlace.name} (~${(feederDist / 55).toFixed(1)}h, ₹${trainMin.toLocaleString("en-IN")}–₹${trainMax.toLocaleString("en-IN")}/pax).\n• Bus: State RTC & intercity coaches (~${(feederDist / 45).toFixed(1)}h, ₹${busMin.toLocaleString("en-IN")}–₹${busMax.toLocaleString("en-IN")}/pax).\n• Cab: Direct highway taxi to airport terminal (~${(feederDist / 65).toFixed(1)}h, ₹${cabMin.toLocaleString("en-IN")}–₹${cabMax.toLocaleString("en-IN")}/vehicle).`;

            transportation_plan.push({
              mode: "Train",
              details: feederDetails,
              estimated_cost: `₹${trainMin.toLocaleString("en-IN")}–₹${trainMax.toLocaleString("en-IN")} (estimate, all travellers)`,
              duration: `${(feederDist / 55).toFixed(1)} - ${(feederDist / 45).toFixed(1)} hours`,
              distance: `${feederDist} km`,
            });
            transportCost += (trainMin + trainMax) / 2;
          }

          // 2. Main Flight Leg
          const departureHubName = hubInfo && hubInfo.isRemoteHub ? hubInfo.hubPlace.name : fromPlace.name;
          const departureIata = hubInfo && hubInfo.isRemoteHub ? hubInfo.iataCode : (fromPlace.iata[0] ?? fromPlace.name);
          const arrivalIata = toPlace.iata[0] ?? toPlace.name;
          const isIntl = fromPlace.countryCode !== toPlace.countryCode;

          const flightDetails = isIntl
            ? `Main Leg 2: Next available flight ${departureHubName} (${departureIata}) → ${toPlace.name} (${arrivalIata}). Scheduled international connection with 1 transit layover in Mumbai (CSMIA - BOM) or Delhi (IGI - DEL). Primary carriers: Air India, IndiGo + international partner codeshares (Air France, Lufthansa, Emirates). Total transit ~14–16 hours.`
            : `Main Leg 2: Next available flight ${departureHubName} (${departureIata}) → ${toPlace.name} (${arrivalIata}). Direct or 1-stop scheduled domestic flight. Total flight transit ~${best.durationHours} hours.`;

          transportation_plan.push({
            mode: "Flight",
            details: flightDetails,
            estimated_cost: `₹${best.costInr[0].toLocaleString("en-IN")}–${best.costInr[1].toLocaleString("en-IN")} (estimate, all travellers)`,
            duration: isIntl ? "14.5 hours (incl. layover)" : `${best.durationHours} hours`,
            distance: `${totalDist.toLocaleString("en-IN")} km`,
          });
          transportCost += (best.costInr[0] + best.costInr[1]) / 2;

          // 3. Destination City Centre Arrival Transfer Leg
          const destLower = toPlace.name.toLowerCase();
          if (destLower.includes("paris")) {
            transportation_plan.push({
              mode: "Local",
              details: `Arrival Leg 3: Paris Charles de Gaulle Airport (CDG) → Central Paris (Châtelet / Gare du Nord / Louvre). Fast transit options:\n• RER B Suburban Express Train: 35 min direct to Châtelet-Les Halles / Gare du Nord (€11.80 / ~₹1,050/pax, departs every 10–15 min).\n• RoissyBus: 60 min express direct to Paris Opéra Garnier (€16.60 / ~₹1,500/pax).\n• Official Parisian Licensed Taxi: 45–55 min flat government-regulated tariff (€56 Right Bank / €65 Left Bank / ~₹5,000–₹5,800/vehicle).`,
              estimated_cost: `€11.80–€56 (~₹1,050–₹5,000, all travellers)`,
              duration: "35 - 55 mins",
              distance: "28 km",
            });
            transportCost += 1500;
          } else if (destLower.includes("london")) {
            transportation_plan.push({
              mode: "Local",
              details: `Arrival Leg 3: London Heathrow Airport (LHR) → Central London (Paddington / Soho / Westminster). Fast transit options:\n• Elizabeth Line: 30 min direct to Central London (£13.30 / ~₹1,450/pax).\n• Heathrow Express: 15 min non-stop to Paddington (£25 / ~₹2,700/pax).\n• London Underground (Piccadilly Line): 50 min budget link (£5.60 / ~₹600/pax).\n• London Black Cab / Licensed Taxi: 45–60 min (£65–£95 / ~₹7,000–₹10,200).`,
              estimated_cost: `£5.60–£65 (~₹600–₹7,000, all travellers)`,
              duration: "30 - 50 mins",
              distance: "24 km",
            });
            transportCost += 1800;
          } else if (destLower.includes("delhi")) {
            transportation_plan.push({
              mode: "Local",
              details: `Arrival Leg 3: Delhi IGI Airport (T3) → Central Delhi (Connaught Place / New Delhi Railway Station).\n• Delhi Airport Express Metro: 19 min high-speed link directly into New Delhi Station (₹60/pax, trains every 10 min).\n• Prepaid Taxi / Ride-hail (Uber/Ola): 35–45 min doorstep ride (₹450–₹650/vehicle).`,
              estimated_cost: `₹60–₹650 (all travellers)`,
              duration: "20 - 45 mins",
              distance: "16 km",
            });
            transportCost += 300;
          } else if (destLower.includes("mumbai")) {
            transportation_plan.push({
              mode: "Local",
              details: `Arrival Leg 3: Mumbai CSMIA Airport (T2) → South Mumbai / Bandra / BKC.\n• Metro Line 3 (Aqua Line) / Local Rail: High-speed connection across financial corridors (₹50–₹100/pax).\n• Prepaid Taxi / Uber: Direct highway connection via Western Express Highway & Sea Link (₹450–₹850/vehicle).`,
              estimated_cost: `₹100–₹850 (all travellers)`,
              duration: "25 - 45 mins",
              distance: "20 km",
            });
            transportCost += 400;
          } else if (isIntl) {
            transportation_plan.push({
              mode: "Local",
              details: `Arrival Leg 3: ${toPlace.name} International Airport → City Centre hotel / central district. Airport express train, dedicated shuttle, or official metered taxi directly to your accommodation.`,
              estimated_cost: `₹450–₹2,500 (estimate, all travellers)`,
              duration: "30 - 50 mins",
              distance: "25 km",
            });
            transportCost += 1000;
          }
        } else {
          // Train, Bus, or Cab mode
          const mode = ({ flight: "Flight", train: "Train", bus: "Bus", cab: "Taxi" } as const)[best.mode as "flight"] ?? "Local";
          const isAmrOrigin = fromPlace.name.toLowerCase().includes("amravati");
          let stepDetails = `${best.title}. ${best.note}`;
          if (isAmrOrigin && best.mode === "train") {
            stepDetails = `Train from Amravati (AMI) / Badnera Junction (BD) → ${toPlace.name}. Available daily express services (e.g. Duronto Express, Vidarbha SF Express, Maharashtra Express). Check Tatkal availability & waitlist confirmation odds.`;
          } else if (isAmrOrigin && toPlace.name.toLowerCase().includes("nagpur")) {
            stepDetails = `Intercity route Amravati → Nagpur (~155 km). Options: 1) Express Train (AMI/BD to NGP, ~2.5h, ₹120–₹550/pax). 2) MSRTC Shivshahi AC Bus via Samruddhi Expressway (~3h, ₹240–₹420/pax). 3) Highway Cab (~2.2h, ₹2,400–₹3,200/vehicle).`;
          }

          transportation_plan.push({
            mode,
            details: stepDetails,
            estimated_cost: `₹${best.costInr[0].toLocaleString("en-IN")}–${best.costInr[1].toLocaleString("en-IN")} (estimate, all travellers)`,
            duration: `${best.durationHours} hours`,
            distance: `${totalDist} km`,
          });
          transportCost += (best.costInr[0] + best.costInr[1]) / 2;
        }
      }
    }
    if (stop.place) prev = stop.place;
  }
  const total = Math.round((transportCost * 2 + stayCost + foodCost + localCost + activitiesCost) * 1.1);
  const firstKb = perStop.find((s) => s.kb)?.kb ?? null;
  const advanceBookingsNeeded = itinerary
    .flatMap((d) => d.activities)
    .filter((a) => a.bookingDeadline && a.bookingDeadline !== "walk-in" && !a.title.includes("Transit"))
    .map((a) => `${a.title} (${a.bookingDeadline})`);
  const hasHighAltitude = stops.some((s) => /ladakh|leh|manali|shimla|darjeeling|ooty|munnar|gangtok|tawang/i.test(s));
  const hasSpiritual = itinerary.some((d) => d.activities.some((a) => /temple|mandir|mosque|church|gurdwara|aarti|ashram/i.test(a.title)));
  const packingEssentials = [
    ...(hasHighAltitude
      ? ["Layered thermals, windproof fleece & UV sunglasses", "Hydration salts, lip balm & basic altitude/motion wellness kit"]
      : ["Breathable cotton/linen daywear & comfortable walking footwear", "Sunscreen SPF 50+, sunglasses & reusable insulated water bottle"]),
    ...(hasSpiritual ? ["Modest traditional attire (covered shoulders/knees) & slip-on shoes for shrines"] : []),
    "Power bank (10,000+ mAh), UPI + ₹2,000 small-denomination cash for local bazaars, and offline Aadhaar/Passport ID copies",
  ];
  const primaryStopKey = (stops[0] || "").toLowerCase().trim();
  const resolvedStopKey = KB_ALIASES[primaryStopKey] ?? primaryStopKey;
  const regionalSpecialties = REGIONAL_DINING[resolvedStopKey] ?? [
    `Signature ${stops[0]} regional thali & festive seasonal sweets`,
    `Morning heritage breakfast & artisanal local street-food trail`,
  ];

  const rawTrip = {
    trip_details: {
      destination: stops.join(" -> "),
      duration: excludeTravel
        ? `${requestedDays} Days stay + 2 travel days (${totalDays} Days total)`
        : isExplicitInclude && requestedDays >= 3
        ? `${totalDays} Days (incl. travel days)`
        : `${totalDays} Days`,
      budget: input.budget || "Moderate",
      vibe: input.vibe || "Balanced",
      total_estimated_cost: `₹${total.toLocaleString("en-IN")} (estimate for ${pax} traveller${pax > 1 ? "s" : ""}, incl. 10% buffer)`,
      travelers: String(pax),
      startDate: startDateIso,
      endDate: endDateIso,
      includeTravelDays: excludeTravel ? ("no" as const) : isExplicitInclude ? ("yes" as const) : undefined,
      bestSeason: firstKb?.season ?? "Oct–Mar pleasant touring window; verify local weather 48h prior to departure",
      localTransitAdvice: `Clustered daily routing saves ~35% transit time. Use app-based cabs/autos for inter-zone hops (>2 km) and walk within heritage precincts.`,
      advanceBookingsNeeded: advanceBookingsNeeded.length > 0 ? Array.from(new Set(advanceBookingsNeeded)) : ["Most stops accept walk-in entry; book intercity rail/flight tickets early"],
      packingEssentials,
      regionalSpecialties,
    },
    transportation_plan,
    hotels,
    itinerary,
  };

  if (rawBudgetNum > 0) {
    return clampTripToUserBudget(rawTrip, rawBudgetNum);
  }
  return rawTrip;
}

/**
 * Clamps the entire generated trip to at most 91% of user's budget.
 * Harmonizes transportation, stays, and activities so all individual line items
 * are consistent with the user's budget (e.g. ₹5,000 budget -> no ₹9,000 flights).
 */
export function clampTripToUserBudget<
  T extends {
    days?: any[];
    itinerary?: any[];
    totalCost?: number;
    budget?: any;
    trip_details?: any;
    transportation_plan?: any[];
    hotels?: any[];
  }
>(trip: T, rawUserBudget?: number): T {
  const daysList = Array.isArray(trip.days)
    ? trip.days
    : Array.isArray(trip.itinerary)
    ? trip.itinerary
    : [];
  const numDays = Math.max(1, daysList.length);
  const pax = Number(trip.trip_details?.travelers) || 1;

  let extractedBudget = typeof rawUserBudget === "number" && rawUserBudget > 0 ? rawUserBudget : 0;
  if (extractedBudget <= 0) {
    const rawStr = String(trip.budget || trip.trip_details?.budget || "");
    const parsedNum = Number(rawStr.replace(/[^\d]/g, ""));
    if (parsedNum > 0) {
      extractedBudget = parsedNum;
    } else {
      if (/luxury|royal|premium/i.test(rawStr)) {
        extractedBudget = numDays * pax * 18000;
      } else if (/budget|cheap|low/i.test(rawStr)) {
        extractedBudget = numDays * pax * 3500;
      } else {
        extractedBudget = numDays * pax * 7500;
      }
    }
  }

  const userBudget = Math.max(1000, extractedBudget);
  const targetTotalCost = Math.floor(userBudget * 0.91); // e.g., ₹4,550 for a ₹5,000 budget

  // Realistic category allocations matching calculateTrueCost in cost engine
  const targetTransport = Math.round(targetTotalCost * 0.27);
  const targetStay = Math.round(targetTotalCost * 0.31);
  const targetFood = Math.round(targetTotalCost * 0.16);
  const targetActivities = Math.round(targetTotalCost * 0.12);
  const targetLocalTransit = Math.round(targetTotalCost * 0.06);

  // 1. Harmonize Transportation Plan: Ensure mode and prices fit within budget
  if (Array.isArray(trip.transportation_plan) && trip.transportation_plan.length > 0) {
    const isBudgetRestricted = userBudget <= 18000;
    const nSteps = trip.transportation_plan.length;
    trip.transportation_plan.forEach((step: any, sIdx: number) => {
      if (isBudgetRestricted && (step.mode === "Flight" || /flight|plane/i.test(step.mode))) {
        step.mode = "Train";
        step.details = `Superfast / Express Train connecting your route comfortably within budget. Use Tatkal / IRCTC booking.`;
      }
      let stepShare = 1 / nSteps;
      if (nSteps === 3) {
        stepShare = sIdx === 0 ? 0.20 : sIdx === 1 ? 0.70 : 0.10;
      } else if (nSteps === 2) {
        stepShare = sIdx === 0 ? 0.25 : 0.75;
      }
      const allocatedTarget = Math.max(100, Math.round(targetTransport * stepShare));
      const minT = Math.max(60, Math.round(allocatedTarget * 0.85));
      const maxT = Math.max(minT + 40, Math.round(allocatedTarget * 1.15));
      step.estimated_cost = `₹${minT.toLocaleString("en-IN")}–₹${maxT.toLocaleString("en-IN")} (estimate, all travellers)`;
    });
  }

  // 2. Harmonize Hotels: Preserve authentic hotel names and realistic pricing from resolveRealHotels
  if (Array.isArray(trip.hotels) && trip.hotels.length > 0) {
    trip.hotels.forEach((hotel: any) => {
      // Never overwrite real hotel prices with impossible ~₹200/night rates or rename to generic hostel
      if (!hotel.price || /₹20[0-9]|₹21[0-9]/i.test(hotel.price)) {
        const floorMin = hotel.tier === "luxury" ? 14000 : hotel.tier === "comfort" ? 4500 : 1800;
        const floorMax = hotel.tier === "luxury" ? 28000 : hotel.tier === "comfort" ? 8500 : 3400;
        hotel.price = `₹${floorMin.toLocaleString("en-IN")}–₹${floorMax.toLocaleString("en-IN")}/night (estimate)`;
      }
    });
  }

  // 3. Harmonize Activities: Scale activity ticket costs realistically
  const allActivities: any[] = [];
  for (const day of daysList) {
    if (Array.isArray(day.activities)) {
      allActivities.push(...day.activities);
    }
  }

  if (allActivities.length > 0) {
    const rawSum = allActivities.reduce(
      (acc, act) => acc + Math.max(1, Number(act.cost ?? act.estimatedCost?.amount ?? act.estimatedCost ?? 50)),
      0
    );
    let runningTotal = 0;
    allActivities.forEach((act, idx) => {
      const weight = Math.max(1, Number(act.cost ?? act.estimatedCost?.amount ?? act.estimatedCost ?? 50)) / rawSum;
      const scaled =
        idx === allActivities.length - 1
          ? Math.max(10, targetActivities - runningTotal)
          : Math.max(10, Math.round(targetActivities * weight));
      runningTotal += scaled;
      act.cost = scaled;
      act.estimatedCost = { amount: scaled, currency: "₹" };
      act.ticket_price = scaled <= 20 ? "Free" : `₹${scaled.toLocaleString("en-IN")}`;
      act.currency = "INR";
    });
  }

  const dailyAllowance = Math.round((targetActivities + targetFood + targetLocalTransit) / numDays);
  for (const day of daysList) {
    if (Array.isArray(day.activities)) {
      day.dailyCost = day.activities.reduce((s: number, a: any) => s + (Number(a.cost) || 0), 0) + Math.round((targetFood + targetLocalTransit) / numDays);
    } else {
      day.dailyCost = dailyAllowance;
    }
  }

  const updatedTripDetails = trip.trip_details
    ? {
        ...trip.trip_details,
        total_estimated_cost: `₹${targetTotalCost.toLocaleString("en-IN")} (estimate for ${pax} traveller${pax > 1 ? "s" : ""}, incl. all transport, stay, meals & activities)`,
      }
    : undefined;

  return {
    ...trip,
    ...(updatedTripDetails ? { trip_details: updatedTripDetails } : {}),
    budget: userBudget,
    totalCost: targetTotalCost,
    estimatedTotalCost: targetTotalCost,
    currency: "INR",
    isUnderBudget: true,
    savingsINR: userBudget - targetTotalCost,
  };
}

