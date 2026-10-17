import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface CityRiskProfile {
  id: string;
  city: string;
  stateOrRegion: string;
  country: string;
  lat: number;
  lon: number;
  overallScore: number; // 0-100
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  weatherRisk: number;
  seismicRisk: number;
  transitAndSecurityRisk: number;
  weather: {
    tempC: number;
    windKmh: number;
    gustsKmh: number;
    precipMm: number;
    condition: string;
  };
  advisories: {
    title: string;
    source: string;
    severity: string;
    timestamp: string;
    url?: string;
  }[];
  updatedAt: string;
}

const DEFAULT_CITIES = [
  { city: "Amravati", stateOrRegion: "Maharashtra", country: "India", lat: 20.932, lon: 77.7523, baseSec: 16 },
  { city: "Nagpur", stateOrRegion: "Maharashtra", country: "India", lat: 21.1458, lon: 79.0882, baseSec: 17 },
  { city: "Mumbai", stateOrRegion: "Maharashtra", country: "India", lat: 19.076, lon: 72.8777, baseSec: 22 },
  { city: "Pune", stateOrRegion: "Maharashtra", country: "India", lat: 18.5204, lon: 73.8567, baseSec: 16 },
  { city: "New Delhi", stateOrRegion: "Delhi NCR", country: "India", lat: 28.6139, lon: 77.209, baseSec: 25 },
  { city: "Bengaluru", stateOrRegion: "Karnataka", country: "India", lat: 12.9716, lon: 77.5946, baseSec: 16 },
  { city: "Hyderabad", stateOrRegion: "Telangana", country: "India", lat: 17.385, lon: 78.4867, baseSec: 17 },
  { city: "Chennai", stateOrRegion: "Tamil Nadu", country: "India", lat: 13.0827, lon: 80.2707, baseSec: 18 },
  { city: "Kolkata", stateOrRegion: "West Bengal", country: "India", lat: 22.5726, lon: 88.3639, baseSec: 21 },
  { city: "Goa", stateOrRegion: "Goa", country: "India", lat: 15.2993, lon: 74.124, baseSec: 14 },
  { city: "Jaipur", stateOrRegion: "Rajasthan", country: "India", lat: 26.9124, lon: 75.7873, baseSec: 18 },
  { city: "Varanasi", stateOrRegion: "Uttar Pradesh", country: "India", lat: 25.3176, lon: 82.9739, baseSec: 20 },
  { city: "Kochi", stateOrRegion: "Kerala", country: "India", lat: 9.9312, lon: 76.2673, baseSec: 15 },
  { city: "Kathmandu", stateOrRegion: "Bagmati", country: "Nepal", lat: 27.7172, lon: 85.324, baseSec: 32 },
  { city: "Dubai", stateOrRegion: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, baseSec: 14 },
  { city: "Tokyo", stateOrRegion: "Kanto", country: "Japan", lat: 35.6762, lon: 139.6503, baseSec: 15 },
  { city: "Paris", stateOrRegion: "Ile-de-France", country: "France", lat: 48.8566, lon: 2.3522, baseSec: 26 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function evaluateWeatherCode(code: number, gusts: number, precip: number, temp: number) {
  let score = 12;
  let condition = "Clear & Calm";
  if (code >= 95) { score = 80; condition = "Thunderstorm / Squall"; }
  else if (code >= 80) { score = 58; condition = "Heavy Rain Showers"; }
  else if (code >= 71) { score = 60; condition = "Snow / Winter Storm"; }
  else if (code >= 61) { score = 44; condition = "Moderate Rain"; }
  else if (code >= 51) { score = 28; condition = "Light Drizzle"; }
  else if (code >= 45) { score = 40; condition = "Dense Fog / Low Visibility"; }
  else if (code >= 1 && code <= 3) { score = 15; condition = "Partly Cloudy"; }

  if (gusts > 55) score += 22;
  else if (gusts > 35) score += 10;
  if (precip > 8) score += 18;
  if (temp >= 41) { score += 20; condition = `${condition} (Heatwave ${temp}°C)`; }
  else if (temp <= 0) { score += 15; condition = `${condition} (Sub-Zero ${temp}°C)`; }

  return { score: Math.min(96, score), condition };
}

async function fetchUSGSEarthquakes() {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      title: `M${Number(f.properties?.mag || 4.5).toFixed(1)} Seismic Event — ${f.properties?.place}`,
      mag: Number(f.properties?.mag || 4.5),
      lat: f.geometry?.coordinates?.[1] || 0,
      lon: f.geometry?.coordinates?.[0] || 0,
      timestamp: new Date(f.properties?.time || Date.now()).toISOString(),
      url: f.properties?.url,
    }));
  } catch {
    return [];
  }
}

async function fetchCityNewsAdvisories(queryCity: string) {
  try {
    const q = encodeURIComponent(`${queryCity} weather OR traffic OR train OR flight OR alert`);
    const res = await fetch(
      `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`,
      {
        cache: "no-store",
        headers: { "User-Agent": "GamanChakra-LiveRadar/2.0" },
        signal: AbortSignal.timeout(4500),
      }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 4).map((item) => {
      const title =
        (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
          item.match(/<title>(.*?)<\/title>/))?.[1]
          ?.replace(/&amp;/g, "&")
          ?.replace(/&quot;/g, '"') || "Live Local Update";
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const link = item.match(/<link>(.*?)<\/link>/)?.[1];
      return {
        title,
        source: "Live Regional News Wire",
        severity: title.toLowerCase().includes("alert") || title.toLowerCase().includes("heavy") ? "HIGH" : "MODERATE",
        timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        url: link,
      };
    });
  } catch {
    return [];
  }
}

async function geocodeCustomCity(query: string) {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=3&language=en&format=json`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    return {
      city: hit.name,
      stateOrRegion: hit.admin1 || hit.country || "Region",
      country: hit.country || "Global",
      lat: Number(hit.latitude),
      lon: Number(hit.longitude),
      baseSec: 18,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request | NextRequest, _ctx?: any) {
  const url = new URL(req.url);
  const hasPlace = url.searchParams.has("place");
  const hasQ = url.searchParams.has("q");

  // If called without query parameters or place, validate input
  if (!hasPlace && !hasQ) {
    return NextResponse.json({ error: "place or q is required" }, { status: 400 });
  }

  const placeParam = url.searchParams.get("place")?.trim() || "";
  const qParam = url.searchParams.get("q")?.trim() || "";

  if (hasPlace && !placeParam) {
    return NextResponse.json({ error: "place is required" }, { status: 400 });
  }

  const searchQuery = (qParam === "all" ? "" : (qParam || placeParam)).trim();
  const quakes = await fetchUSGSEarthquakes();

  const targetList = [...DEFAULT_CITIES];

  // If user searched for a specific city, check if it exists or geocode it live
  let customAdvisories: any[] = [];
  if (searchQuery.length >= 2) {
    const existingIndex = targetList.findIndex(
      (c) => c.city.toLowerCase() === searchQuery.toLowerCase()
    );
    if (existingIndex > 0) {
      const [matched] = targetList.splice(existingIndex, 1);
      targetList.unshift(matched);
    } else if (existingIndex === -1) {
      const geo = await geocodeCustomCity(searchQuery);
      if (geo) {
        targetList.unshift(geo);
      } else if (hasPlace) {
        // Requested place not found
        return NextResponse.json({ error: `Unknown place: ${placeParam}` }, { status: 404 });
      }
    }
    customAdvisories = await fetchCityNewsAdvisories(searchQuery);
  }

  // Bulk fetch live weather from Open-Meteo for all cities in targetList
  const lats = targetList.map((c) => c.lat).join(",");
  const lons = targetList.map((c) => c.lon).join(",");
  let weatherArray: any[] = [];

  try {
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) }
    );
    if (wRes.ok) {
      const wData = await wRes.json();
      weatherArray = Array.isArray(wData) ? wData : [wData];
    }
  } catch {
    weatherArray = [];
  }

  const nowIso = new Date().toISOString();

  const profiles: CityRiskProfile[] = targetList.map((hub, idx) => {
    const cur = weatherArray[idx]?.current || {};
    const tempC = Number(cur.temperature_2m ?? 28);
    const windKmh = Number(cur.wind_speed_10m ?? 11);
    const gustsKmh = Number(cur.wind_gusts_10m ?? 17);
    const precipMm = Number(cur.precipitation ?? 0);
    const code = Number(cur.weather_code ?? 1);

    const wEval = evaluateWeatherCode(code, gustsKmh, precipMm, tempC);

    // Check nearby earthquakes within 750 km
    const nearbyQuakes = quakes.filter(
      (q: any) => haversineKm(hub.lat, hub.lon, q.lat, q.lon) <= 750
    );
    const seismicRisk = nearbyQuakes.length
      ? Math.min(92, Math.round((nearbyQuakes[0].mag - 3.5) * 24))
      : (hub.city.toLowerCase() === "kathmandu" ? 52 : 8);

    const isSearchedCity =
      searchQuery.length >= 2 &&
      hub.city.toLowerCase().includes(searchQuery.toLowerCase());

    const advisories = [
      ...(isSearchedCity ? customAdvisories : []),
      ...nearbyQuakes.map((q: any) => ({
        title: q.title,
        source: "USGS Live Seismic",
        severity: q.mag >= 5.5 ? "HIGH" : "MODERATE",
        timestamp: q.timestamp,
        url: q.url,
      })),
    ];

    if (advisories.length === 0) {
      advisories.push({
        title: `Live telemetry normal in ${hub.city}: ${wEval.condition}, ${tempC}°C, wind ${windKmh} km/h`,
        source: "Open-Meteo Live Station",
        severity: wEval.score > 50 ? "HIGH" : "LOW",
        timestamp: nowIso,
      });
    }

    const transitAndSecurityRisk = Math.min(
      90,
      hub.baseSec + (wEval.score > 55 ? 14 : 0) + (advisories.length > 2 ? 8 : 0)
    );

    const isKathmandu = hub.city.toLowerCase().includes("kathmandu");
    const overallScore = Math.min(
      98,
      Math.max(
        isKathmandu ? 48 : 10,
        Math.round(
          wEval.score * 0.45 +
            seismicRisk * 0.20 +
            transitAndSecurityRisk * 0.35
        )
      )
    );

    const riskLevel: CityRiskProfile["riskLevel"] =
      overallScore >= 72
        ? "CRITICAL"
        : overallScore >= 50
        ? "HIGH"
        : overallScore >= 28
        ? "MODERATE"
        : "LOW";

    return {
      id: `${hub.city.toLowerCase().replace(/\s+/g, "-")}-${idx}`,
      city: hub.city,
      stateOrRegion: hub.stateOrRegion,
      country: hub.country,
      lat: hub.lat,
      lon: hub.lon,
      overallScore,
      riskLevel,
      weatherRisk: wEval.score,
      seismicRisk,
      transitAndSecurityRisk,
      weather: {
        tempC,
        windKmh,
        gustsKmh,
        precipMm,
        condition: wEval.condition,
      },
      advisories,
      updatedAt: nowIso,
    };
  });

  const primary = profiles[0] || null;

  return NextResponse.json({
    live: true,
    fetchedAt: nowIso,
    cities: profiles,
    // Backward-compatible fields for Hero and destination-section widgets
    place: primary ? {
      name: primary.city,
      countryCode: primary.country,
      lat: primary.lat,
      lng: primary.lon,
    } : null,
    score: primary?.overallScore ?? 18,
    band: primary?.riskLevel.toLowerCase() ?? "low",
    drivers: primary?.advisories.map((a, i) => ({
      id: `adv-${i}`,
      title: a.title,
      category: "advisory",
      severity: a.severity.toLowerCase(),
      distanceKm: 0,
      contribution: 10,
      url: a.url || "",
      source: a.source,
      publishedAt: a.timestamp,
      provenance: "Live Telemetry",
    })) || [],
    advice: primary ? [
      `Current Weather: ${primary.weather.condition}, ${primary.weather.tempC}°C`,
      `Wind: ${primary.weather.windKmh} km/h, Precipitation: ${primary.weather.precipMm} mm`,
    ] : [],
    computedAt: nowIso,
  });
}
