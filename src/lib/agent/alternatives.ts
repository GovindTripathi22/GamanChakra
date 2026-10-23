import { haversineKm, type Place } from "@/lib/geo/gazetteer";

export interface RouteOption {
  id: string;
  mode: "flight" | "train" | "bus" | "cab" | "wait";
  title: string;
  durationHours: number;
  costInr: [number, number];
  reliability: number; // 0..1 likelihood it works given the disruption
  score: number;
  note: string;
  bookingUrl?: string;
  provenance: "estimated";
}

/**
 * Multi-modal re-routing estimator. Produces ranked alternatives from distance-based models
 * (calibrated on typical Indian & international fares) and deep links to book — no supplier API needed.
 * Figures are estimates and are labelled as such in the UI.
 */
export function findAlternatives(input: {
  origin?: Place | null;
  destination: Place;
  disruptedMode?: string;
  disruptionCategory?: string;
  travelers?: number;
}): RouteOption[] {
  const { origin, destination } = input;
  const pax = input.travelers ?? 1;
  const d = origin ? haversineKm(origin, destination) : 0;
  const domesticIN = origin ? origin.countryCode === "IN" && destination.countryCode === "IN" : destination.countryCode === "IN";
  const sameCountry = origin ? origin.countryCode === destination.countryCode : true;
  const opts: RouteOption[] = [];
  const blocked = (m: string) => (input.disruptedMode ?? "").toLowerCase().includes(m);
  const airportIssue = /transport|weather|infrastructure|conflict/.test(input.disruptionCategory ?? "");
  const fromCode = origin?.iata[0] ?? origin?.name ?? "";
  const flightOriginLabel = origin?.iata[0]
    ? (origin.name.toUpperCase() === origin.iata[0] ? origin.iata[0] : `${origin.iata[0]} (${origin.name})`)
    : origin?.name ?? "";
  const toCode = destination.iata[0] ?? destination.name;

  if (origin && d > 250) {
    const intl = !sameCountry;
    const dur = 1.6 + d / 720 + (intl ? 1.5 : 0);
    const base = intl ? 9000 + d * 5.5 : 3200 + d * 4.2;
    opts.push({
      id: "alt-flight", mode: "flight", title: `Next available flight ${flightOriginLabel} → ${toCode}`, durationHours: +dur.toFixed(1),
      costInr: [Math.round(base * pax), Math.round(base * 1.9 * pax)], reliability: blocked("flight") || airportIssue ? 0.55 : 0.85, score: 0,
      note: blocked("flight") ? "Same mode as the disrupted leg — pick a different carrier or airport if possible." : `Fastest option; connects via ${fromCode} hub with feeder transit from ${origin.name}. Prices rise close to departure.`,
      bookingUrl: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${fromCode} to ${toCode}`)}`, provenance: "estimated",
    });
  }
  if (origin && domesticIN && d <= 2200 && d > 60) {
    const dur = d / 58 + 0.5;
    opts.push({
      id: "alt-train", mode: "train", title: `Train ${origin.name} → ${destination.name} (3AC / Chair Car)`, durationHours: +dur.toFixed(1),
      costInr: [Math.round(d * 1.1 * pax), Math.round(d * 2.6 * pax)], reliability: blocked("train") ? 0.5 : 0.8, score: 0,
      note: "Use Tatkal / premium Tatkal if travelling within 24 h; check waitlist confirmation odds in Waitlist Rescue.",
      bookingUrl: "https://www.irctc.co.in/nget/train-search", provenance: "estimated",
    });
  }
  if (origin && sameCountry && d <= 900 && d > 40) {
    const dur = d / 45 + 0.5;
    opts.push({
      id: "alt-bus", mode: "bus", title: `Overnight sleeper bus ${origin.name} → ${destination.name}`, durationHours: +dur.toFixed(1),
      costInr: [Math.round(d * 1.4 * pax), Math.round(d * 2.8 * pax)], reliability: blocked("bus") || /civil_unrest/.test(input.disruptionCategory ?? "") ? 0.45 : 0.75, score: 0,
      note: "Good fallback when flights are grounded by fog or strikes; avoid during bandh hours.",
      bookingUrl: `https://www.redbus.in/`, provenance: "estimated",
    });
  }
  if (origin && sameCountry && d <= 650 && d > 15) {
    const dur = d / 52 + 0.3;
    const cars = Math.ceil(pax / 4);
    opts.push({
      id: "alt-cab", mode: "cab", title: `Private cab / self-drive ${origin.name} → ${destination.name}`, durationHours: +dur.toFixed(1),
      costInr: [Math.round(d * 12 * cars), Math.round(d * 18 * cars)], reliability: /civil_unrest|natural_disaster/.test(input.disruptionCategory ?? "") ? 0.5 : 0.82, score: 0,
      note: "Door-to-door and flexible; check road closures and drive in daylight.", provenance: "estimated",
    });
  }
  opts.push({
    id: "alt-wait", mode: "wait", title: "Hold position and re-check in 6 hours", durationHours: 6, costInr: [0, 2500 * pax], reliability: 0.6, score: 0,
    note: "Sensible for short-lived disruptions (fog, short strikes). The agent will keep watching and alert you.", provenance: "estimated",
  });

  // Rank: reliability first, then time, then cost (normalised)
  const maxH = Math.max(...opts.map((o) => o.durationHours), 1);
  const maxC = Math.max(...opts.map((o) => o.costInr[1]), 1);
  for (const o of opts) o.score = Math.round(100 * (0.5 * o.reliability + 0.3 * (1 - o.durationHours / maxH) + 0.2 * (1 - o.costInr[1] / maxC)));
  return opts.sort((a, b) => b.score - a.score);
}
