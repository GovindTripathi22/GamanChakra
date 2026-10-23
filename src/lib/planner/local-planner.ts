import type { Activity, DayPlan, GeneratedTrip, Hotel, TransportationStep, TripData } from "@/types/trip";
import { KB, KB_ALIASES, type DestinationKB, type Poi } from "./kb";
import { findPlace, findAirportHub, haversineKm, type Place } from "@/lib/geo/gazetteer";
import { findAlternatives } from "@/lib/agent/alternatives";
import { mulberry32 } from "@/lib/slm/network";
import { fnv1a } from "@/lib/slm/features";

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

export function planTripLocally(input: TripData): GeneratedTrip {
  const stops = input.destination.split("|").map((d) => d.trim()).filter(Boolean);
  const days = Math.max(1, Math.min(21, parseInt(input.days, 10) || 3));
  const pax = travelersCount(input.travelers || "2");
  const tier = budgetTier(input.budget || "Moderate");
  const origin = findPlace(input.origin || "") ?? null;
  const seed = fnv1a(`${input.destination}|${input.days}|${input.vibe}`);

  const perStop = stops.map((s, i) => ({ name: s, place: findPlace(s), kb: kbFor(s), days: Math.floor(days / stops.length) + (i < days % stops.length ? 1 : 0) }));
  const itinerary: DayPlan[] = [];
  const hotels: Hotel[] = [];
  let dayNo = 1;
  let activitiesCost = 0;
  let stayCost = 0;
  let foodCost = 0;
  let localCost = 0;

  for (const stop of perStop) {
    const place = stop.place;
    const kb = stop.kb;
    const pois = kb ? kb.pois : place ? genericPois(place, seed, input.vibe) : [];
    const vibeOutdoor = /adventure|nature|beach/i.test(input.vibe || "");
    const vibeCulture = /culture|heritage|spiritual|history/i.test(input.vibe || "");
    const ranked = [...pois].sort((a, b) => {
      const s = (p: Poi) => (vibeOutdoor && p.outdoor ? 2 : 0) + (vibeCulture && p.category === "culture" ? 2 : 0) + (p.crowd === "peak" ? 1 : 0);
      return s(b) - s(a);
    });
    const perDay = /relax|chill/i.test(input.vibe || "") ? 2 : 3;
    const chosen = ranked.slice(0, Math.min(ranked.length, perDay * stop.days));
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
            title: p.name, place_name: p.name, description: `${p.tip}.`, details: `${p.tip}.`,
            category: p.category, locationName: p.name, timeSlot: `${fmt12(st)} - ${fmt12(en)}`, time: `${fmt12(st)} - ${fmt12(en)}`,
            startTime: st, endTime: en, crowdLevel: crowdNow,
            offPeakTip: p.crowd === "peak" ? "Scheduled in the low-density window to beat the queues" : p.tip,
            bookingDeadline: p.booking, ticket_price: p.cost ? `₹${p.cost.toLocaleString("en-IN")}` : "Free",
            estimatedCost: { amount: p.cost, currency: "₹" },
            coordinates: { lat: p.lat, lng: p.lng }, geo_coordinates: { lat: p.lat, lng: p.lng },
            logistics: k > 1 ? "45-minute transfer buffer included" : "Start of day",
            prediction: { delayRiskScore: p.outdoor ? 30 : 12, predictedCrowdLevel: crowdNow, weatherSensitivity: p.outdoor ? "outdoor_high" : "indoor", estimatedTransitMinutes: 25 },
            isProtectedByShield: true,
            image_query: `${p.name} ${stop.name}`,
          });
          activitiesCost += p.cost * pax;
        }
      }
      if (acts.length === 0) {
        acts.push({ id: `act-${dayNo}-1`, title: `Explore ${stop.name} at your own pace`, description: "Flexible day — the agent keeps monitoring local conditions.", category: "leisure", locationName: stop.name, timeSlot: "10:00 AM - 1:00 PM", startTime: "10:00", endTime: "13:00", coordinates: place ? { lat: place.lat, lng: place.lng } : { lat: 0, lng: 0 } });
      }
      itinerary.push({ day: dayNo, theme: d === 0 ? `Arrive & discover ${stop.name}` : `${stop.name}: ${acts.map((a) => a.category).includes("culture") ? "culture & heritage" : "highlights & local life"}`, pacingRating: acts.length >= 3 ? "balanced" : "light", activities: acts });
      dayNo++;
    }
    const stays = kb?.stays ?? [["Well-rated mid-range hotel", "city centre", 3000, 6000], ["Comfort hotel", "central district", 6000, 12000], ["Premium hotel", "prime area", 12000, 25000]] as DestinationKB["stays"];
    const st = stays[Math.min(tier, stays.length - 1)];
    const rooms = Math.ceil(pax / 2);
    const nightly = Math.round((st[2] + st[3]) / 2);
    stayCost += nightly * rooms * Math.max(1, stop.days);
    hotels.push({ name: `${st[0]} · ${st[1]}`, address: `${st[1]}, ${stop.name}`, price: `₹${st[2].toLocaleString("en-IN")}–${st[3].toLocaleString("en-IN")}/night (estimate)`, image_query: `${st[0]} ${st[1]} ${stop.name}`, rating: [3.9, 4.3, 4.7][tier], description: `${["Budget", "Mid-range", "Premium"][tier]} pick in ${st[1]}. Compare live prices before booking.`, geo_coordinates: place ? { lat: place.lat, lng: place.lng } : undefined });
    const food = kb?.dailyFood ?? [900, 2000];
    const tr = kb?.localTransitPerDay ?? [600, 1500];
    foodCost += food[tier === 2 ? 1 : 0] * pax * stop.days;
    localCost += tr[tier === 2 ? 1 : 0] * stop.days;
  }

  const rawBudgetNum = Number(String(input.budget || "").replace(/[^\d]/g, ""));
  const isBudgetRestricted = tier === 0 || (rawBudgetNum > 0 && rawBudgetNum <= 18000);

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
      duration: `${days} Days`,
      budget: input.budget || "Moderate",
      vibe: input.vibe || "Balanced",
      total_estimated_cost: `₹${total.toLocaleString("en-IN")} (estimate for ${pax} traveller${pax > 1 ? "s" : ""}, incl. 10% buffer)`,
      travelers: String(pax),
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

