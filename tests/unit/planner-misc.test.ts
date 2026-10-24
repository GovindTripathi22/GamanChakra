import { describe, it, expect } from "vitest";
import { planTripLocally } from "@/lib/planner/local-planner";
import { findAlternatives } from "@/lib/agent/alternatives";
import { findPlace, findAirportHub } from "@/lib/geo/gazetteer";
import { translatePhrase } from "@/lib/jarvis/phrasebook";
import { advisory, inr } from "@/lib/slm/nlg";
import { rateLimit } from "@/lib/ratelimit";
import { signSession, verifySession, hmacHex } from "@/lib/auth/token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { convert } from "@/lib/fx";
import {
  getDestinationIntelligence,
  calculateSeasonalForecast,
  ALL_INDIAN_DESTINATIONS,
} from "@/lib/destination-intelligence/analytics";

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
  it("generates detailed 3-leg multimodal transit for secondary origins like Amravati to Paris", () => {
    const intlTrip = planTripLocally({ origin: "Amravati", destination: "Paris", days: "5", budget: "Moderate", travelers: "2", vibe: "Cultural" });
    expect(intlTrip.transportation_plan).toHaveLength(3);

    // Leg 1: Feeder leg starting from Amravati to Nagpur Hub
    const leg1 = intlTrip.transportation_plan[0];
    expect(leg1.details).toMatch(/Amravati/i);
    expect(leg1.details).toMatch(/Nagpur/i);
    expect(leg1.distance).toMatch(/155/);

    // Leg 2: Main flight from Nagpur (NAG) to Paris (CDG) with transit layover
    const leg2 = intlTrip.transportation_plan[1];
    expect(leg2.mode).toBe("Flight");
    expect(leg2.details).toMatch(/Nagpur/i);
    expect(leg2.details).toMatch(/Paris/i);
    expect(leg2.details).toMatch(/BOM|DEL|layover/i);

    // Leg 3: Arrival city transfer from Paris CDG to Central Paris
    const leg3 = intlTrip.transportation_plan[2];
    expect(leg3.mode).toBe("Local");
    expect(leg3.details).toMatch(/Paris Charles de Gaulle/i);
    expect(leg3.details).toMatch(/RER B|RoissyBus|Taxi/i);
  });
  it("resolves short aliases like Amt to Amravati and maps to Nagpur remote hub", () => {
    const p = findPlace("Amt");
    expect(p).not.toBeNull();
    expect(p?.name).toBe("Amravati");
    const hub = findAirportHub(p!);
    expect(hub).not.toBeNull();
    expect(hub?.hubPlace.name).toBe("Nagpur");
    expect(hub?.isRemoteHub).toBe(true);
    expect(hub?.distanceKm).toBeGreaterThan(100);
  });
  it("populates real hotels with high-resolution image URLs, real names and star ratings", () => {
    const jaipurTrip = planTripLocally({ origin: "Delhi", destination: "Jaipur", days: "3", budget: "Luxury", travelers: "2", vibe: "Cultural" });
    expect(jaipurTrip.hotels.length).toBeGreaterThanOrEqual(1);
    const h = jaipurTrip.hotels[0];
    expect(h.name).toMatch(/Rambagh Palace|ITC Rajputana|Umaid Bhawan/i);
    expect(h.image_url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(h.rating).toBeGreaterThanOrEqual(4.0);
    expect(h.amenities?.length).toBeGreaterThan(0);
  });
  it("handles 11-day trip with travel days included: Day 1 departure, Days 2-10 destination, Day 11 return", () => {
    const trip11Incl = planTripLocally({
      origin: "Delhi",
      destination: "Jaipur",
      days: "11",
      budget: "Moderate",
      travelers: "2",
      vibe: "Cultural",
      includeTravelDays: "yes",
    });
    expect(trip11Incl.itinerary).toHaveLength(11);
    expect(trip11Incl.trip_details.duration).toContain("11 Days (incl. travel days)");
    // Day 1 is departure & travel
    expect(trip11Incl.itinerary[0].theme).toMatch(/Departure from Delhi & Travel to Jaipur/i);
    expect(trip11Incl.itinerary[0].activities.some((a) => a.title.includes("Transit") || a.title.includes("Check-in"))).toBe(true);
    // Middle days 2 to 10 are destination days
    expect(trip11Incl.itinerary[1].theme).toMatch(/Jaipur/i);
    // Day 11 is return travel
    expect(trip11Incl.itinerary[10].theme).toMatch(/Return Journey & Farewell to Jaipur/i);
    expect(trip11Incl.itinerary[10].activities.some((a) => a.title.includes("Check-out") || a.title.includes("Return Transit"))).toBe(true);
  });
  it("handles 11-day trip with pure destination stay: 11 full days at destination + 2 travel days = 13 total days", () => {
    const trip11Excl = planTripLocally({
      origin: "Delhi",
      destination: "Jaipur",
      days: "11",
      budget: "Moderate",
      travelers: "2",
      vibe: "Cultural",
      includeTravelDays: "no",
    });
    expect(trip11Excl.itinerary).toHaveLength(13);
    expect(trip11Excl.trip_details.duration).toContain("11 Days stay + 2 travel days (13 Days total)");
    // Day 1 is departure
    expect(trip11Excl.itinerary[0].theme).toMatch(/Departure from Delhi & Travel to Jaipur/i);
    // 11 destination days (Days 2 to 12)
    for (let i = 1; i <= 11; i++) {
      expect(trip11Excl.itinerary[i].activities.length).toBeGreaterThan(0);
      expect(trip11Excl.itinerary[i].theme).toMatch(/Jaipur/i);
    }
    // Day 13 is return travel
    expect(trip11Excl.itinerary[12].theme).toMatch(/Return Journey & Farewell to Jaipur/i);
  });
  it("calculates exact calendar dates for 11-day trips with startDate provided", () => {
    const tripWithDates = planTripLocally({
      origin: "Delhi",
      destination: "Goa",
      days: "11",
      budget: "Comfort",
      travelers: "2",
      vibe: "Relaxed",
      startDate: "2026-11-01",
      includeTravelDays: "yes",
    });
    expect(tripWithDates.trip_details.startDate).toBe("2026-11-01");
    expect(tripWithDates.trip_details.endDate).toBe("2026-11-11");
    expect(tripWithDates.itinerary[0].date).toBe("Sun, 1 Nov");
    expect(tripWithDates.itinerary[10].date).toBe("Wed, 11 Nov");

    const tripPureStayDates = planTripLocally({
      origin: "Delhi",
      destination: "Goa",
      days: "11",
      budget: "Comfort",
      travelers: "2",
      vibe: "Relaxed",
      startDate: "2026-11-01",
      includeTravelDays: "no",
    });
    expect(tripPureStayDates.trip_details.startDate).toBe("2026-11-01");
    expect(tripPureStayDates.trip_details.endDate).toBe("2026-11-13");
    expect(tripPureStayDates.itinerary[0].date).toBe("Sun, 1 Nov");
    expect(tripPureStayDates.itinerary[12].date).toBe("Fri, 13 Nov");
  });
  it("generates real high-fidelity hotel fallbacks with Unsplash images for unlisted destinations", () => {
    const customTrip = planTripLocally({
      origin: "Kolkata",
      destination: "Kaziranga",
      days: "4",
      budget: "Moderate",
      travelers: "2",
      vibe: "Nature",
    });
    expect(customTrip.hotels.length).toBeGreaterThanOrEqual(1);
    const h = customTrip.hotels[0];
    expect(h.name).toContain("Kaziranga");
    expect(h.image_url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(h.rating).toBeGreaterThanOrEqual(4.0);
    expect(h.amenities?.length).toBeGreaterThan(0);
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

describe("destination intelligence all-india expansion", () => {
  it("covers over 130 locations across all regions of India", () => {
    expect(ALL_INDIAN_DESTINATIONS.length).toBeGreaterThanOrEqual(130);
    expect(ALL_INDIAN_DESTINATIONS).toContain("Amravati");
    expect(ALL_INDIAN_DESTINATIONS).toContain("Srirangam");
    expect(ALL_INDIAN_DESTINATIONS).toContain("Munnar");
    expect(ALL_INDIAN_DESTINATIONS).toContain("Ayodhya");
    expect(ALL_INDIAN_DESTINATIONS).toContain("Kaziranga");
    expect(ALL_INDIAN_DESTINATIONS).toContain("Tawang");
  });

  it("retrieves rich macro metrics for western hub Amravati", async () => {
    const metrics = await getDestinationIntelligence("Amravati");
    expect(metrics.length).toBeGreaterThan(0);
    const m = metrics[0];
    expect(m.destination).toBe("Amravati");
    expect(m.state).toBe("Maharashtra");
    expect(m.region).toBe("West");
    expect(m.avgRoomRateINR).toBeGreaterThan(2000);
    expect(m.hotelOccupancyRate).toBeGreaterThan(0.5);
  });

  it("computes seasonal forecasts for hill station Munnar and spiritual Srirangam", () => {
    const munnar = calculateSeasonalForecast("Munnar");
    expect(munnar.surgeMultiplier).toBeGreaterThan(1.2);
    expect(munnar.recommendedAdvanceDays).toBeGreaterThanOrEqual(25);

    const srirangam = calculateSeasonalForecast("Srirangam");
    expect(srirangam.peakSeason).toMatch(/Vaikunta Ekadashi/i);
    expect(srirangam.highRiskFactor).toMatch(/pilgrim/i);
  });

  it("dynamically generates fallback metrics for unlisted custom Indian locations without crashing", async () => {
    const unlisted = await getDestinationIntelligence("Chanderi");
    expect(unlisted.length).toBeGreaterThan(0);
    const m = unlisted[0];
    expect(m.destination).toBe("Chanderi");
    expect(m.observedVisitors).toBeGreaterThan(10000);
    expect(m.avgRoomRateINR).toBeGreaterThan(1000);
  });
});
