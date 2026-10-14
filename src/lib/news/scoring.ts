import { CATEGORY_META, SEVERITY_RANK, type NewsCategory, type Severity } from "@/lib/slm/labels";

/**
 * Travel-impact score 0–100 for a news event (before it is matched to any specific trip).
 *   impact = 100 × categoryWeight × severityFactor × confidenceFactor × recencyFactor × geoFactor × reliability
 */
export function impactScore(input: {
  category: NewsCategory;
  severity: Severity;
  confidence: number;
  publishedAt: Date;
  hasGeo: boolean;
  reliability?: number;
  now?: Date;
}): number {
  const w = CATEGORY_META[input.category].weight;
  if (w === 0) return 0;
  const sev = [0.25, 0.5, 0.78, 1][SEVERITY_RANK[input.severity]];
  const conf = 0.6 + 0.4 * Math.min(1, Math.max(0, input.confidence));
  const ageH = Math.max(0, ((input.now ?? new Date()).getTime() - input.publishedAt.getTime()) / 36e5);
  const recency = ageH <= 6 ? 1 : ageH <= 24 ? 0.85 : ageH <= 72 ? 0.6 : 0.35;
  const geo = input.hasGeo ? 1 : 0.7;
  const rel = input.reliability ?? 0.8;
  return Math.round(Math.min(100, 100 * w * sev * conf * recency * geo * (0.7 + 0.3 * rel)));
}

/** Exposure of a traveller/trip to an event, 0–100: distance decay inside the event radius and time overlap. */
export function exposureScore(input: {
  eventImpact: number;
  distanceKm: number;
  radiusKm: number;
  sameCountry: boolean;
  category: NewsCategory;
  tripStart: Date;
  tripEnd: Date;
  eventAt: Date;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const countryWide = input.category === "policy_advisory" || input.category === "price_economy" || input.category === "health_outbreak";
  let spatial = 0;
  if (input.distanceKm <= input.radiusKm) spatial = 1 - 0.6 * (input.distanceKm / Math.max(1, input.radiusKm));
  else if (input.distanceKm <= input.radiusKm * 2) spatial = 0.25 * (1 - (input.distanceKm - input.radiusKm) / input.radiusKm);
  if (countryWide && input.sameCountry) spatial = Math.max(spatial, 0.55);
  if (spatial <= 0) return 0;
  // temporal: trip in progress or starting within 7 days matters most; past trips do not
  if (input.tripEnd.getTime() < now.getTime() - 864e5) return 0;
  const daysToStart = (input.tripStart.getTime() - now.getTime()) / 864e5;
  const temporal = daysToStart <= 0 ? 1 : daysToStart <= 3 ? 0.9 : daysToStart <= 7 ? 0.7 : daysToStart <= 21 ? 0.4 : 0.15;
  return Math.round(Math.min(100, input.eventImpact * spatial * temporal * 1.25));
}

export function riskBand(score: number): "clear" | "watch" | "elevated" | "high" | "severe" {
  if (score >= 75) return "severe";
  if (score >= 55) return "high";
  if (score >= 35) return "elevated";
  if (score >= 15) return "watch";
  return "clear";
}
