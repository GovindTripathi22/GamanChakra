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
  const stops = input.destination.split("|").map((d) => d.trim()).filter(Boolean);
  const rawDays = parseInt(input.days, 10) || 3;
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

  const perStop = stops.map((s, i) => ({
    name: s,
    place: findPlace(s),
    kb: kbFor(s),
    days: Math.floor(destStayDays / stops.length) + (i < destStayDays % stops.length ? 1 : 0),
  }));

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
      activities: arrActs,
    });
    activitiesCost += 450 * pax; // dinner cost
    dayNo = 2;
  }

  // Generate Destination Stay Days
  for (const stop of perStop) {
    const place = stop.place;
    const kb = stop.kb;
    const perDay = /relax|chill/i.test(input.vibe || "") ? 2 : 3;
    const neededPois = perDay * Math.max(1, stop.days);
    const pois = getDestinationPois(stop.name, place, kb, seed, input.vibe, neededPois);

    const vibeOutdoor = /adventure|nature|beach/i.test(input.vibe || "");
    const vibeCulture = /culture|heritage|spiritual|history/i.test(input.vibe || "");
    const ranked = [...pois].sort((a, b) => {
      const s = (p: Poi) => (vibeOutdoor && p.outdoor ? 2 : 0) + (vibeCulture && p.category === "culture" ? 2 : 0) + (p.crowd === "peak" ? 1 : 0);
      return s(b) - s(a);
    });
    const chosen = ranked.slice(0, Math.min(ranked.length, neededPois));

    for (let d = 0; d < stop.days; d++) {
      const dayPois = orderByProximity(chosen.slice(d * perDay, d * perDay + perDay));
      // slot assignment: peak-crowd & outdoor -> morning, evening items -> evening
      const slots: Record<string, Poi[]> = { morning: [], afternoon: [], evening: [] };
      for (const p of dayPois) {
        let slot: string = p.slot === "any" ? "afternoon" : p.slot;
        if (p.crowd === "peak" && p.slot !== "evening") slot = "morning";
        if (slots[slot].length >= 1) slot = ["morning", "afternoon", "evening"].find((s) => slots[s].length === 0) ?? slot;
        slots[slot].push(p);
      }
      const acts: Activity[] = [];
      let k = 0;
      for (const slot of ["morning", "afternoon", "evening"] as const) {
        for (const p of slots[slot]) {
          const [st, en] = SLOT_TIMES[slot][Math.min(k % 2, 1)];
          const crowdNow = p.crowd === "peak" && slot === "morning" ? "moderate" : p.crowd;
          acts.push({
            id: `act-${dayNo}-${++k}`,
            title: p.name,
            place_name: p.name,
            description: `${p.tip}.`,
            details: `${p.tip}.`,
            category: p.category,
            locationName: p.name,
            timeSlot: `${fmt12(st)} - ${fmt12(en)}`,
            time: `${fmt12(st)} - ${fmt12(en)}`,
            startTime: st,
            endTime: en,
            crowdLevel: crowdNow,
            offPeakTip: p.crowd === "peak" ? "Scheduled in the low-density window to beat the queues" : p.tip,
            bookingDeadline: p.booking,
            ticket_price: p.cost ? `₹${p.cost.toLocaleString("en-IN")}` : "Free",
            estimatedCost: { amount: p.cost, currency: "₹" },
            coordinates: { lat: p.lat, lng: p.lng },
            geo_coordinates: { lat: p.lat, lng: p.lng },
            logistics: k > 1 ? "45-minute transfer buffer included" : "Start of day",
            prediction: { delayRiskScore: p.outdoor ? 30 : 12, predictedCrowdLevel: crowdNow, weatherSensitivity: p.outdoor ? "outdoor_high" : "indoor", estimatedTransitMinutes: 25 },
            isProtectedByShield: true,
            image_query: `${p.name} ${stop.name}`,
          });
          activitiesCost += p.cost * pax;
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
      const dayTheme = !hasTravelDaysSplit && d === 0
        ? `Arrive & discover ${stop.name}`
        : `${stop.name}: ${acts.map((a) => a.category).includes("culture") ? "culture & heritage" : "highlights & local life"}`;
      itinerary.push({
        day: dayNo,
        theme: dayTheme,
        date: formatDateForDay(dayNo - 1),
        pacingRating: acts.length >= 3 ? "balanced" : "light",
        activities: acts,
      });
      dayNo++;
    }
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
  const extractedBudget =
    typeof rawUserBudget === "number" && rawUserBudget > 0
      ? rawUserBudget
      : Number(String(trip.budget || trip.trip_details?.budget || "").replace(/[^\d]/g, "")) || 10000;
  const userBudget = Math.max(100, extractedBudget);
  const targetTotalCost = Math.floor(userBudget * 0.91); // e.g., ₹4,550 for a ₹5,000 budget

  const daysList = Array.isArray(trip.days)
    ? trip.days
    : Array.isArray(trip.itinerary)
    ? trip.itinerary
    : [];
  const numDays = Math.max(1, daysList.length);
  const pax = Number(trip.trip_details?.travelers) || 1;

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

  // 2. Harmonize Hotels: Nightly rate fits accommodation allocation
  if (Array.isArray(trip.hotels) && trip.hotels.length > 0) {
    const rooms = Math.ceil(pax / 2);
    const nightlyStay = Math.max(250, Math.round(targetStay / (numDays * rooms)));
    const minH = Math.round(nightlyStay * 0.85);
    const maxH = Math.round(nightlyStay * 1.15);
    trip.hotels.forEach((hotel: any) => {
      hotel.price = `₹${minH.toLocaleString("en-IN")}–₹${maxH.toLocaleString("en-IN")}/night (estimate)`;
      if (nightlyStay < 1000) {
        if (!/hostel|homestay|guesthouse/i.test(hotel.name)) {
          hotel.name = `Budget Traveler Homestay / Hostel · Central`;
        }
        hotel.description = `Clean, verified budget stay or homestay fitting within your ₹${userBudget.toLocaleString("en-IN")} trip budget.`;
      } else if (nightlyStay < 2500) {
        hotel.description = `Comfortable hotel fitting within your ₹${userBudget.toLocaleString("en-IN")} trip budget.`;
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

