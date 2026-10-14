import { describe, it, expect } from "vitest";
import { impactScore, exposureScore, riskBand } from "@/lib/news/scoring";
import { matchExposures, combineScores, destinationRiskFrom } from "@/lib/risk/engine";
import { estimateCompensation, detectRegime } from "@/lib/claims/calculator";

const NOW = new Date("2026-10-13T06:00:00Z");
const ev = (o: Partial<Parameters<typeof matchExposures>[0][0]> = {}) => ({ id: "e1", title: "Quake", category: "natural_disaster", severity: "high", impactScore: 70, placeName: "Kathmandu", countryCode: "NP", lat: 27.72, lng: 85.32, radiusKm: 250, publishedAt: NOW, url: "u", source: "s", provenance: "live", ...o });

describe("impact & exposure scoring", () => {
  it("is monotonic in severity and decays with age", () => {
    const base = { category: "natural_disaster" as const, confidence: 0.9, hasGeo: true, now: NOW };
    const hi = impactScore({ ...base, severity: "critical", publishedAt: NOW });
    const lo = impactScore({ ...base, severity: "moderate", publishedAt: NOW });
    const old = impactScore({ ...base, severity: "critical", publishedAt: new Date(NOW.getTime() - 60 * 36e5) });
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeGreaterThan(old);
    expect(impactScore({ ...base, category: "not_travel", severity: "critical", publishedAt: NOW })).toBe(0);
  });
  it("exposure decays with distance and ignores finished trips", () => {
    const common = { eventImpact: 80, radiusKm: 200, sameCountry: true, category: "natural_disaster" as const, eventAt: NOW, now: NOW, tripStart: NOW, tripEnd: new Date(NOW.getTime() + 3 * 864e5) };
    expect(exposureScore({ ...common, distanceKm: 10 })).toBeGreaterThan(exposureScore({ ...common, distanceKm: 180 }));
    expect(exposureScore({ ...common, distanceKm: 900 })).toBe(0);
    expect(exposureScore({ ...common, distanceKm: 10, tripStart: new Date("2026-09-01"), tripEnd: new Date("2026-09-05") })).toBe(0);
  });
  it("country-wide advisories reach anyone in the country", () => {
    expect(exposureScore({ eventImpact: 60, radiusKm: 100, sameCountry: true, category: "policy_advisory", eventAt: NOW, now: NOW, tripStart: NOW, tripEnd: NOW, distanceKm: 2000 })).toBeGreaterThan(0);
  });
  it("bands and probabilistic OR", () => {
    expect(riskBand(80)).toBe("severe"); expect(riskBand(5)).toBe("clear");
    expect(combineScores([50, 50])).toBe(75);
    expect(combineScores([])).toBe(0);
  });
  it("matches subjects to nearby events only", () => {
    const subjects = [
      { type: "traveler" as const, id: "t1", orgId: "o", name: "A", destination: "Kathmandu", lat: 27.7, lng: 85.3, countryCode: "NP", start: NOW, end: new Date(NOW.getTime() + 864e5) },
      { type: "traveler" as const, id: "t2", orgId: "o", name: "B", destination: "London", lat: 51.5, lng: -0.12, countryCode: "GB", start: NOW, end: new Date(NOW.getTime() + 864e5) },
    ];
    const x = matchExposures([ev()], subjects, NOW);
    expect(x.map((e) => e.subject.id)).toEqual(["t1"]);
    expect(x[0].reason).toMatch(/Kathmandu/);
  });
  it("destination risk explains its drivers", () => {
    const r = destinationRiskFrom([ev(), ev({ id: "e2", category: "travel_opportunity", impactScore: 20 })], { name: "Kathmandu", countryCode: "NP", lat: 27.72, lng: 85.32 }, NOW);
    expect(r.score).toBeGreaterThan(40);
    expect(r.drivers.map((d) => d.id)).toEqual(["e1"]);
    expect(r.advice.length).toBeGreaterThan(0);
  });
});

describe("passenger-rights compensation", () => {
  it("detects the regime", () => {
    expect(detectRegime({ kind: "delay", departureCountry: "FR", arrivalCountry: "IN", distanceKm: 6600 })).toBe("EU261");
    expect(detectRegime({ kind: "delay", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 1000 })).toBe("DGCA_IN");
    expect(detectRegime({ kind: "delay", departureCountry: "GB", arrivalCountry: "IN", distanceKm: 6700 })).toBe("UK261");
    expect(detectRegime({ kind: "delay", departureCountry: "IN", arrivalCountry: "US", distanceKm: 12000, carrierCountry: "US" })).toBe("US_DOT");
  });
  it("EU261 distance bands and long-haul 3–4h halving", () => {
    expect(estimateCompensation({ kind: "delay", departureCountry: "DE", arrivalCountry: "FR", distanceKm: 900, delayHoursAtArrival: 3.5 }).amount).toBe(250);
    expect(estimateCompensation({ kind: "delay", departureCountry: "DE", arrivalCountry: "IN", distanceKm: 6200, delayHoursAtArrival: 3.5 }).amount).toBe(300);
    expect(estimateCompensation({ kind: "delay", departureCountry: "DE", arrivalCountry: "IN", distanceKm: 6200, delayHoursAtArrival: 5 }).amount).toBe(600);
    expect(estimateCompensation({ kind: "delay", departureCountry: "DE", arrivalCountry: "FR", distanceKm: 900, delayHoursAtArrival: 2 }).eligible).toBe(false);
  });
  it("extraordinary circumstances remove cash compensation", () => {
    const r = estimateCompensation({ kind: "cancellation", departureCountry: "ES", arrivalCountry: "IT", distanceKm: 1000, noticeDays: 0, extraordinary: true });
    expect(r.amount).toBe(0);
    expect(r.entitlements.join(" ")).toMatch(/refund/i);
  });
  it("DGCA cancellation tiers by block time and fare cap", () => {
    expect(estimateCompensation({ kind: "cancellation", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 500, blockTimeHours: 0.9, noticeDays: 1 }).amount).toBe(5000);
    expect(estimateCompensation({ kind: "cancellation", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 1200, blockTimeHours: 1.8, noticeDays: 1 }).amount).toBe(7500);
    expect(estimateCompensation({ kind: "cancellation", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 2000, blockTimeHours: 2.6, noticeDays: 1, basicFareInr: 4200 }).amount).toBe(4200);
    expect(estimateCompensation({ kind: "cancellation", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 2000, noticeDays: 20 }).amount).toBe(0);
  });
  it("DGCA denied boarding caps", () => {
    expect(estimateCompensation({ kind: "denied_boarding", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 1000, basicFareInr: 6000, alternateWithinHours: 5 }).amount).toBe(10000);
    expect(estimateCompensation({ kind: "denied_boarding", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 1000, basicFareInr: 3000, alternateWithinHours: 30 }).amount).toBe(12000);
    expect(estimateCompensation({ kind: "denied_boarding", departureCountry: "IN", arrivalCountry: "IN", distanceKm: 1000, alternateWithinHours: 0.5 }).amount).toBe(0);
  });
  it("produces a claim letter", () => expect(estimateCompensation({ kind: "delay", departureCountry: "FR", arrivalCountry: "DE", distanceKm: 900, delayHoursAtArrival: 4 }).letter).toMatch(/261\/2004/));
});
