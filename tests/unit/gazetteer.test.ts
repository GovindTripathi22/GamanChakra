import { describe, it, expect } from "vitest";
import { extractPlaces, findPlace, haversineKm, nearestCity, primaryPlace } from "@/lib/geo/gazetteer";

describe("offline gazetteer", () => {
  it("finds cities, countries and aliases", () => {
    expect(extractPlaces("Massive earthquake strikes near Kathmandu, Nepal").map((p) => `${p.name}:${p.kind}`)).toEqual(["Kathmandu:city", "Nepal:country"]);
    expect(findPlace("Bombay")?.name).toBe("Mumbai");
    expect(findPlace("Banaras")?.name).toBe("Varanasi");
  });
  it("does not match common English words", () => {
    expect(extractPlaces("Nice weather today")).toHaveLength(0);
    expect(extractPlaces("Strike in Split, Croatia").map((p) => p.name)).toContain("Split");
  });
  it("matches IATA codes only with aviation context", () => {
    expect(extractPlaces("Flights cancelled at DEL").some((p) => p.kind === "airport")).toBe(true);
    expect(extractPlaces("The CEO said DEL was fine").some((p) => p.kind === "airport")).toBe(false);
  });
  it("haversine distance is accurate (Delhi–Mumbai ≈ 1150 km)", () => {
    const d = haversineKm(findPlace("Delhi")!, findPlace("Mumbai")!);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1200);
  });
  it("reverse-geocodes to nearest city", () => {
    expect(nearestCity(27.95, 85.55)?.name).toBe("Kathmandu");
    expect(nearestCity(-60, -30)).toBeNull();
  });
  it("prefers cities as primary place", () => expect(primaryPlace("India: floods in Assam's Guwahati")?.name).toBe("Guwahati"));
});
