import { describe, it, expect } from "vitest";
import { parseTripPrompt } from "@/lib/planner/prompt-parser";

describe("Natural Language Trip Prompt Parser", () => {
  it("extracts from-to, days, budget and travelers accurately", () => {
    const res = parseTripPrompt("trip from Mumbai to Goa for 5 days under 20k with couple");
    expect(res.destination.toLowerCase()).toContain("goa");
    expect(res.origin?.toLowerCase()).toContain("mumbai");
    expect(res.days).toBe("5");
    expect(res.budget).toBe("cheap");
    expect(res.travelers).toBe("couple");
    expect(res.detectedChips.length).toBeGreaterThanOrEqual(4);
  });

  it("extracts international flights with high budget and friends group", () => {
    const res = parseTripPrompt("Delhi to Paris 7 days budget 1.5 lakh with friends");
    expect(res.destination.toLowerCase()).toContain("paris");
    expect(res.origin?.toLowerCase()).toContain("delhi");
    expect(res.days).toBe("7");
    expect(res.budget).toBe("luxury");
    expect(res.travelers).toBe("friends");
  });

  it("handles 'to X from Y' inversion and dates", () => {
    const res = parseTripPrompt("trip to Udaipur from Jaipur 4 days luxury romantic starting 2026-11-20");
    expect(res.destination.toLowerCase()).toContain("udaipur");
    expect(res.origin?.toLowerCase()).toContain("jaipur");
    expect(res.days).toBe("4");
    expect(res.budget).toBe("luxury");
    expect(res.startDate).toBe("2026-11-20");
  });

  it("handles Hindi / Hinglish phrasing", () => {
    const res = parseTripPrompt("Mumbai se Goa 4 din 2 log budget 25000");
    expect(res.destination.toLowerCase()).toContain("goa");
    expect(res.origin?.toLowerCase()).toContain("mumbai");
    expect(res.days).toBe("4");
    expect(res.travelers).toBe("couple");
    expect(res.budget).toBe("moderate");
  });

  it("handles solo adventure trip with cheap keyword", () => {
    const res = parseTripPrompt("Amravati to Manali 4 days cheap solo adventure");
    expect(res.destination.toLowerCase()).toContain("manali");
    expect(res.origin?.toLowerCase()).toContain("amravati");
    expect(res.days).toBe("4");
    expect(res.budget).toBe("cheap");
    expect(res.travelers).toBe("just-me");
    expect(res.vibe).toBe("adventure");
  });

  it("falls back gracefully for single destination name", () => {
    const res = parseTripPrompt("Goa");
    expect(res.destination.toLowerCase()).toBe("goa");
  });
});
