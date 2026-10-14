import { describe, it, expect } from "vitest";
import { decide, levelIndex, TASK_POLICY } from "@/lib/agent/policy";
import { playbookFor } from "@/lib/agent/playbooks";
import { ruleMatches, tasksFromRule, RuleSchema, RULE_TEMPLATES } from "@/lib/agent/automations";
import type { Exposure } from "@/lib/risk/engine";

const NOW = new Date();
function exposure(over: { category?: string; severity?: string; score?: number; type?: "trip" | "traveler"; title?: string; startOffsetDays?: number } = {}): Exposure {
  const start = new Date(NOW.getTime() + (over.startOffsetDays ?? 0) * 864e5);
  return {
    subject: { type: over.type ?? "traveler", id: "s1", orgId: "o1", name: "Asha", destination: "Delhi", lat: 28.6, lng: 77.2, countryCode: "IN", start, end: new Date(start.getTime() + 3 * 864e5), transportMode: "flight" },
    event: { id: "e1", title: over.title ?? "Dense fog: 200 flights cancelled at Delhi", category: over.category ?? "transport_disruption", severity: over.severity ?? "high", impactScore: 70, placeName: "Delhi", countryCode: "IN", lat: 28.6, lng: 77.2, radiusKm: 80, publishedAt: NOW, url: "u", source: "s", provenance: "live" },
    score: over.score ?? 70, distanceKm: 5, band: "high", reason: "test",
  };
}

describe("autonomy policy", () => {
  it("L0 records, L2 proposes check-ins, L3 executes them, L4 holds seats", () => {
    expect(decide("notify", "L0")).toBe("record");
    expect(decide("notify", "L1")).toBe("execute");
    expect(decide("checkin", "L2")).toBe("propose");
    expect(decide("checkin", "L3")).toBe("execute");
    expect(decide("hold_rebooking", "L3")).toBe("propose");
    expect(decide("hold_rebooking", "L4")).toBe("execute");
  });
  it("every task kind is reversible and has a minimum level", () => {
    for (const p of Object.values(TASK_POLICY)) { expect(p.reversible).toBe(true); expect(levelIndex(p.minAutoLevel)).toBeGreaterThan(0); }
  });
});

describe("playbooks", () => {
  it("flight chaos → advisory, notify, reroute, seat hold, compensation, escalation", () => {
    const kinds = playbookFor(exposure()).map((t) => t.kind);
    expect(kinds).toEqual(expect.arrayContaining(["advisory", "notify", "reroute", "hold_rebooking", "compensation_claim", "escalate"]));
    expect(kinds).not.toContain("checkin");
  });
  it("earthquake near a traveller → safety check-in", () => {
    expect(playbookFor(exposure({ category: "natural_disaster", title: "M6.5 quake" })).map((t) => t.kind)).toContain("checkin");
  });
  it("weather on a trip → re-schedule the day", () => {
    expect(playbookFor(exposure({ type: "trip", category: "severe_weather", title: "Heavy rain red alert", score: 40 })).map((t) => t.kind)).toContain("reschedule");
  });
  it("low exposure → advisory only", () => {
    expect(playbookFor(exposure({ score: 20 })).map((t) => t.kind)).toEqual(["advisory"]);
  });
  it("far-future trips are not re-routed yet", () => {
    expect(playbookFor(exposure({ startOffsetDays: 20 })).map((t) => t.kind)).not.toContain("reroute");
  });
});

describe("automation rules", () => {
  it("templates validate against the schema", () => { for (const t of RULE_TEMPLATES) expect(() => RuleSchema.parse(t)).not.toThrow(); });
  it("matches on category, severity, exposure, country and keywords", () => {
    const x = exposure();
    expect(ruleMatches({ categories: ["transport_disruption"], minSeverity: "moderate", minExposure: 50 }, x)).toBe(true);
    expect(ruleMatches({ categories: ["health_outbreak"] }, x)).toBe(false);
    expect(ruleMatches({ minSeverity: "critical" }, x)).toBe(false);
    expect(ruleMatches({ countries: ["AE"] }, x)).toBe(false);
    expect(ruleMatches({ keywords: ["fog"] }, x)).toBe(true);
  });
  it("turns rule actions into attributed tasks", () => {
    const t = tasksFromRule({ name: "Fog rule", actions: [{ type: "checkin" }, { type: "notify" }] }, exposure());
    expect(t.map((x) => x.kind)).toEqual(["checkin", "notify"]);
    expect(t[0].source).toBe("rule:Fog rule");
  });
  it("rejects invalid rules", () => expect(() => RuleSchema.parse({ name: "x", conditions: {}, actions: [] })).toThrow());
});
