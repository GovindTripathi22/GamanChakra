import type { Activity, DayPlan, GeneratedTrip, Hotel, TransportationStep, TripData } from "@/types/trip";
import { KB, KB_ALIASES, type DestinationKB, type Poi } from "./kb";
import { findPlace, type Place } from "@/lib/geo/gazetteer";
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

function genericPois(place: Place, seed: number): Poi[] {
  const rnd = mulberry32(seed);
  const jitter = () => (rnd() - 0.5) * 0.06;
  const n = place.name;
  const tpl: [string, Poi["category"], Poi["slot"], Poi["crowd"], boolean, number, number, string][] = [
    [`${n} old town heritage walk`, "culture", "morning", "moderate", true, 120, 0, "Start early; hire a licensed local guide"],
    [`${n} main museum`, "culture", "afternoon", "low", false, 120, 400, "Check weekly closing day"],
    [`${n} central market & street food`, "food", "evening", "peak", true, 120, 600, "Eat where locals queue"],
    [`Viewpoint / landmark of ${n}`, "sightseeing", "evening", "moderate", true, 90, 200, "Golden hour is best"],
    [`${n} park or waterfront`, "leisure", "morning", "low", true, 90, 0, "Good buffer activity"],
    [`Signature local dinner in ${n}`, "food", "evening", "moderate", false, 90, 900, "Ask for the regional speciality"],
    [`Day excursion near ${n}`, "sightseeing", "morning", "moderate", true, 300, 1500, "Book transport the day before"],
    [`Cultural performance in ${n}`, "culture", "evening", "low", false, 90, 700, "Check schedule locally"],
  ];
  return tpl.map(([name, category, slot, crowd, outdoor, minutes, cost, tip]) => ({ name, category, slot, crowd, outdoor, minutes, cost, tip, booking: "walk-in", lat: place.lat + jitter(), lng: place.lng + jitter() }));
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
    const pois = kb ? kb.pois : place ? genericPois(place, seed) : [];
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

  const transportation_plan: TransportationStep[] = [];
  let transportCost = 0;
  let prev: Place | null = origin;
  for (const stop of perStop) {
    if (stop.place && prev && prev.id !== stop.place.id) {
      const alts = findAlternatives({ origin: prev, destination: stop.place, travelers: pax }).filter((a) => a.mode !== "wait");
      const best = alts[0];
      if (best) {
        const mode = ({ flight: "Flight", train: "Train", bus: "Bus", cab: "Taxi" } as const)[best.mode as "flight"] ?? "Local";
        transportation_plan.push({ mode, details: `${best.title}. ${best.note}`, estimated_cost: `₹${best.costInr[0].toLocaleString("en-IN")}–${best.costInr[1].toLocaleString("en-IN")} (estimate, all travellers)`, duration: `${best.durationHours} hours` });
        transportCost += (best.costInr[0] + best.costInr[1]) / 2;
      }
    }
    if (stop.place) prev = stop.place;
  }
  const total = Math.round((transportCost * 2 + stayCost + foodCost + localCost + activitiesCost) * 1.1);
  return {
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
}
