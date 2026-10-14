import type { PlaceResolutionResult } from "../types";

/**
 * OpenStreetMap Nominatim Place Resolution Provider
 * 100% Free, Zero API Key Required, Respects OSM Usage Policy
 */
export async function resolvePlace(query: string): Promise<PlaceResolutionResult | null> {
  const now = new Date().toISOString();

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "VoyageTravelPlatform/1.0 (contact: info@voyage.app)",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Nominatim returned status ${res.status}`);
    }

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const first = results[0];
    return {
      name: first.name || query,
      displayName: first.display_name,
      placeRef: `osm:${first.osm_type || "node"}:${first.osm_id}`,
      coordinates: {
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      },
      category: first.class || first.type || "place",
      osmType: first.osm_type,
      provenance: {
        source: "OpenStreetMap Nominatim Live Geocoding",
        lastCheckedAt: now,
        status: "verified",
        isMock: false,
        confidence: 0.95,
      },
    };
  } catch (error) {
    // If offline or query fails, return null so verification pipeline can flag as unverified per P1
    return null;
  }
}
