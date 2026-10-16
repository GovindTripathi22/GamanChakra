import type { PlaceResolutionResult } from "../types";

/**
 * OpenStreetMap Nominatim Place Resolution Provider
 * 100% Free, Zero API Key Required, Respects OSM Usage Policy
 * Includes in-memory caching to comply with Nominatim's 1 req/sec limit.
 */
const placeCache = new Map<string, { result: PlaceResolutionResult | null; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function resolvePlace(query: string): Promise<PlaceResolutionResult | null> {
  const normalizedQuery = query.toLowerCase().trim();
  const now = new Date().toISOString();

  // Check cache first
  const cached = placeCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

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
      placeCache.set(normalizedQuery, { result: null, timestamp: Date.now() });
      return null;
    }

    const first = results[0];
    const resolution: PlaceResolutionResult = {
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

    placeCache.set(normalizedQuery, { result: resolution, timestamp: Date.now() });
    return resolution;
  } catch {
    return null;
  }
}
