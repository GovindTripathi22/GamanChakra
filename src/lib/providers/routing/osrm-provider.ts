import type { TransitRoutingResult } from "../types";

/**
 * Calculates Haversine distance in meters between two lat/lng points.
 */
function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Project OSRM Routing Provider
 * 100% Free, Zero API Key Required, OpenStreetMap Network
 */
export async function calculateTransitRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: "driving" | "walking" = "driving"
): Promise<TransitRoutingResult> {
  const now = new Date().toISOString();

  try {
    const url = `http://router.project-osrm.org/route/v1/${mode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM returned status ${res.status}`);
    }

    const data = await res.json();
    const route = data.routes?.[0];

    if (!route) {
      throw new Error("No route found in OSRM response");
    }

    const distanceMeters = Math.round(route.distance);
    const durationSeconds = Math.round(route.duration);

    return {
      distanceMeters,
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60),
      mode,
      originCoordinates: origin,
      destinationCoordinates: destination,
      provenance: {
        source: "Project OSRM Live Open Routing Engine",
        lastCheckedAt: now,
        status: "verified",
        isMock: false,
        confidence: 0.95,
      },
    };
  } catch (error) {
    // Deterministic fallback based on Haversine distance with realistic Indian traffic speeds
    const distanceMeters = haversineDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng);
    // Average urban driving speed: 25 km/h (approx 7 m/s); walking speed: 4.5 km/h (1.25 m/s)
    const speedMps = mode === "walking" ? 1.25 : 7.0;
    const durationSeconds = Math.round(distanceMeters / speedMps);

    return {
      distanceMeters,
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60),
      mode,
      originCoordinates: origin,
      destinationCoordinates: destination,
      provenance: {
        source: "Deterministic Haversine Transit Heuristic",
        lastCheckedAt: now,
        status: "estimated",
        isMock: true,
        confidence: 0.8,
      },
    };
  }
}
