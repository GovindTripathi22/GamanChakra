import { describe, it, expect } from "vitest";
import { planTripLocally } from "@/lib/planner/local-planner";
import { findAlternatives } from "@/lib/agent/alternatives";
import { findPlace } from "@/lib/geo/gazetteer";
import { translatePhrase } from "@/lib/jarvis/phrasebook";
import { advisory, inr } from "@/lib/slm/nlg";
import { rateLimit } from "@/lib/ratelimit";
import { signSession, verifySession, hmacHex } from "@/lib/auth/token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { convert } from "@/lib/fx";

describe("keyless trip planner", () => {
  const trip = planTripLocally({ origin: "Delhi", destination: "Jaipur", days: "3", budget: "Moderate", travelers: "2 People", vibe: "Cultural" });
  it("builds one day per requested day with real POIs", () => {
    expect(trip.itinerary).toHaveLength(3);
    expect(trip.itinerary.flatMap((d) => d.activities.map((a) => a.title))).toContain("Amber Fort");
  });
  it("puts peak-crowd sights in the morning window", () => {
    const amber = trip.itinerary.flatMap((d) => d.activities).find((a) => a.title === "Amber Fort")!;
    expect(Number(amber.startTime.split(":")[0])).toBeLessThan(11);
  });
  it("has transport, hotels and an honest estimate", () => {
    expect(trip.transportation_plan.length).toBeGreaterThan(0);
    expect(trip.hotels[0].price).toMatch(/estimate/);
    expect(trip.trip_details.total_estimated_cost).toMatch(/^₹[\d,]+/);
  });
  it("is deterministic", () => expect(planTripLocally({ origin: "Delhi", destination: "Jaipur", days: "3", budget: "Moderate", travelers: "2", vibe: "Cultural" }).itinerary[0].activities.map((a) => a.title)).toEqual(trip.itinerary[0].activities.map((a) => a.title)));
  it("handles unknown destinations and multi-city", () => {
    expect(planTripLocally({ origin: "Pune", destination: "Hampi", days: "2", budget: "Cheap", travelers: "1", vibe: "Adventure" }).itinerary).toHaveLength(2);
    expect(planTripLocally({ origin: "Delhi", destination: "Jaipur | Agra", days: "4", budget: "Luxury", travelers: "2", vibe: "Culture" }).itinerary).toHaveLength(4);
  });
});

describe("re-routing alternatives", () => {
  it("ranks options and penalises the disrupted mode", () => {
    const o = findAlternatives({ origin: findPlace("Mumbai"), destination: findPlace("Goa")!, disruptedMode: "flight", disruptionCategory: "transport_disruption" });
    expect(o.map((x) => x.mode)).toEqual(expect.arrayContaining(["flight", "train", "bus", "cab", "wait"]));
    expect(o[0].mode).not.toBe("flight");
    for (let i = 1; i < o.length; i++) expect(o[i - 1].score).toBeGreaterThanOrEqual(o[i].score);
  });
  it("no trains or buses across oceans", () => {
    expect(findAlternatives({ origin: findPlace("Delhi"), destination: findPlace("London")! }).map((x) => x.mode)).toEqual(expect.not.arrayContaining(["train", "bus"]));
  });
});

describe("phrasebook, NLG, FX", () => {
  it("translates with native script and voice", () => expect(translatePhrase("thank you", "japanese")).toMatchObject({ native: "ありがとうございます", voice: "ja-JP" }));
  it("handles aliases and unknowns", () => { expect(translatePhrase("toilet", "french")?.native).toMatch(/toilettes/); expect(translatePhrase("hi", "klingon")).toBeNull(); });
  it("writes bilingual advisories", () => {
    const en = advisory({ title: "Drill: Curfew in Srinagar", category: "civil_unrest", severity: "high", place: "Srinagar", travelerName: "Asha" });
    expect(en.body).not.toMatch(/Drill/); expect(en.headline).toMatch(/Srinagar/);
    expect(advisory({ title: "x", category: "civil_unrest", severity: "high", lang: "hi" }).body).toMatch(/[ऀ-ॿ]/);
    expect(inr(150000)).toBe("₹1,50,000");
  });
  it("converts currency offline when the ECB feed is unreachable", async () => {
    const r = await convert(100, "USD", "INR");
    expect(r.result).toBeGreaterThan(5000);
  });
});

describe("security primitives", () => {
  it("signs and verifies sessions; rejects tampering and expiry", async () => {
    const t = await signSession({ uid: "u", oid: "o", role: "owner", plan: "free", name: "N", email: "e@x.com", sv: 1 });
    expect((await verifySession(t))?.uid).toBe("u");
    const [b, s] = t.split(".");
    expect(await verifySession(`${b}x.${s}`)).toBeNull();
    expect(await verifySession(t, "another-secret-another-secret-123456")).toBeNull();
    expect(await verifySession(await signSession({ uid: "u", oid: "o", role: "owner", plan: "free", name: "N", email: "e", sv: 1 }, -10))).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
  });
  it("hashes passwords with scrypt", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    await expect(hashPassword("short")).rejects.toThrow();
  });
  it("hmac is stable", async () => expect(await hmacHex("a")).toBe(await hmacHex("a")));
  it("token bucket rate limiting", () => {
    const k = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(k, { capacity: 3, refillPerSec: 0.0001 }).ok).toBe(true);
    expect(rateLimit(k, { capacity: 3, refillPerSec: 0.0001 }).ok).toBe(false);
  });
});
