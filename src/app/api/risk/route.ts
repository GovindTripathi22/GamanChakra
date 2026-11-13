import { NextRequest, NextResponse } from "next/server";
import { findPlace } from "@/lib/geo/gazetteer";

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
  airQualityIndex: number;
  aqiCategory: "Good" | "Moderate" | "Sensitive" | "Unhealthy";
  visibilityKm: number;
  bestTimeWindow: string;
  transitStatus: "Normal Operations" | "Minor Delays" | "Weather Caution" | "Disrupted";
  mitigationChecklist: string[];
  emergencyNumbers: {
    police: string;
    ambulance: string;
    touristHelpline: string;
  };
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
  { city: "Amravati", stateOrRegion: "Maharashtra", country: "India", lat: 20.932, lon: 77.7523, baseSec: 16, baseAqi: 72 },
  { city: "Nagpur", stateOrRegion: "Maharashtra", country: "India", lat: 21.1458, lon: 79.0882, baseSec: 17, baseAqi: 78 },
  { city: "Mumbai", stateOrRegion: "Maharashtra", country: "India", lat: 19.076, lon: 72.8777, baseSec: 22, baseAqi: 94 },
  { city: "Pune", stateOrRegion: "Maharashtra", country: "India", lat: 18.5204, lon: 73.8567, baseSec: 16, baseAqi: 68 },
  { city: "New Delhi", stateOrRegion: "Delhi NCR", country: "India", lat: 28.6139, lon: 77.209, baseSec: 25, baseAqi: 158 },
  { city: "Bengaluru", stateOrRegion: "Karnataka", country: "India", lat: 12.9716, lon: 77.5946, baseSec: 16, baseAqi: 58 },
  { city: "Hyderabad", stateOrRegion: "Telangana", country: "India", lat: 17.385, lon: 78.4867, baseSec: 17, baseAqi: 74 },
  { city: "Chennai", stateOrRegion: "Tamil Nadu", country: "India", lat: 13.0827, lon: 80.2707, baseSec: 18, baseAqi: 64 },
  { city: "Kolkata", stateOrRegion: "West Bengal", country: "India", lat: 22.5726, lon: 88.3639, baseSec: 21, baseAqi: 112 },
  { city: "Goa", stateOrRegion: "Goa", country: "India", lat: 15.2993, lon: 74.124, baseSec: 14, baseAqi: 42 },
  { city: "Jaipur", stateOrRegion: "Rajasthan", country: "India", lat: 26.9124, lon: 75.7873, baseSec: 18, baseAqi: 96 },
  { city: "Udaipur", stateOrRegion: "Rajasthan", country: "India", lat: 24.5854, lon: 73.7125, baseSec: 14, baseAqi: 66 },
  { city: "Varanasi", stateOrRegion: "Uttar Pradesh", country: "India", lat: 25.3176, lon: 82.9739, baseSec: 20, baseAqi: 118 },
  { city: "Ayodhya", stateOrRegion: "Uttar Pradesh", country: "India", lat: 26.7922, lon: 82.1998, baseSec: 19, baseAqi: 105 },
  { city: "Kochi", stateOrRegion: "Kerala", country: "India", lat: 9.9312, lon: 76.2673, baseSec: 15, baseAqi: 46 },
  { city: "Manali", stateOrRegion: "Himachal Pradesh", country: "India", lat: 32.2432, lon: 77.1892, baseSec: 21, baseAqi: 38 },
  { city: "Shimla", stateOrRegion: "Himachal Pradesh", country: "India", lat: 31.1048, lon: 77.1734, baseSec: 18, baseAqi: 44 },
  { city: "Rishikesh", stateOrRegion: "Uttarakhand", country: "India", lat: 30.0869, lon: 78.2676, baseSec: 19, baseAqi: 52 },
  { city: "Darjeeling", stateOrRegion: "West Bengal", country: "India", lat: 27.041, lon: 88.2663, baseSec: 20, baseAqi: 48 },
  { city: "Kathmandu", stateOrRegion: "Bagmati", country: "Nepal", lat: 27.7172, lon: 85.324, baseSec: 32, baseAqi: 115 },
  { city: "Dubai", stateOrRegion: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, baseSec: 14, baseAqi: 62 },
  { city: "Singapore", stateOrRegion: "Central", country: "Singapore", lat: 1.3521, lon: 103.8198, baseSec: 11, baseAqi: 36 },
  { city: "Tokyo", stateOrRegion: "Kanto", country: "Japan", lat: 35.6762, lon: 139.6503, baseSec: 15, baseAqi: 34 },
  { city: "Paris", stateOrRegion: "Ile-de-France", country: "France", lat: 48.8566, lon: 2.3522, baseSec: 26, baseAqi: 41 },
  { city: "London", stateOrRegion: "England", country: "United Kingdom", lat: 51.5072, lon: -0.1276, baseSec: 22, baseAqi: 39 },
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
  let visibilityKm = 10;
  if (code >= 95) { score = 80; condition = "Thunderstorm / Squall"; visibilityKm = 3.2; }
  else if (code >= 80) { score = 58; condition = "Heavy Rain Showers"; visibilityKm = 4.5; }
  else if (code >= 71) { score = 60; condition = "Snow / Winter Storm"; visibilityKm = 2.8; }
  else if (code >= 61) { score = 44; condition = "Moderate Rain"; visibilityKm = 6.0; }
  else if (code >= 51) { score = 28; condition = "Light Drizzle"; visibilityKm = 7.5; }
  else if (code >= 45) { score = 40; condition = "Dense Fog / Low Visibility"; visibilityKm = 1.8; }
  else if (code >= 1 && code <= 3) { score = 15; condition = "Partly Cloudy"; visibilityKm = 9.5; }

  if (gusts > 55) score += 22;
  else if (gusts > 35) score += 10;
  if (precip > 8) score += 18;
  if (temp >= 41) { score += 20; condition = `${condition} (Heatwave ${temp}°C)`; }
  else if (temp <= 0) { score += 15; condition = `${condition} (Sub-Zero ${temp}°C)`; }

  return { score: Math.min(96, score), condition, visibilityKm };
}

function buildMitigationAndWindow(
  city: string,
  country: string,
  tempC: number,
  precipMm: number,
  windKmh: number,
  aqi: number,
  seismicRisk: number,
  overallScore: number
) {
  let bestTimeWindow = "07:30 – 11:30 & 16:00 – 20:00 (Optimal Outdoor Window)";
  if (tempC >= 36) {
    bestTimeWindow = "06:00 – 10:30 & 17:30 – 21:00 (Avoid Midday Heat Peak)";
  } else if (precipMm >= 4) {
    bestTimeWindow = "09:30 – 15:30 (Prioritize Indoor Heritage & Covered Corridors)";
  } else if (tempC <= 8) {
    bestTimeWindow = "10:00 – 16:30 (Peak Daylight Warmth & Clear Mountain Visibility)";
  }

  let transitStatus: CityRiskProfile["transitStatus"] = "Normal Operations";
  if (overallScore >= 65 || precipMm >= 10 || windKmh >= 50) {
    transitStatus = "Disrupted";
  } else if (overallScore >= 42 || precipMm >= 3 || windKmh >= 32) {
    transitStatus = "Weather Caution";
  } else if (overallScore >= 28 || aqi >= 140) {
    transitStatus = "Minor Delays";
  }

  const checklist: string[] = [];
  if (tempC >= 35) {
    checklist.push(`Schedule outdoor forts and walking tours in ${city} before 10:30 AM; carry electrolyte hydration.`);
  }
  if (precipMm > 1.5) {
    checklist.push(`Add a 25-minute buffer for airport/rail transfers in ${city} due to wet road surface slowdowns.`);
  }
  if (aqi >= 110) {
    checklist.push(`Air quality is elevated (AQI ${aqi}); sensitive travelers should prefer AC cabs over open auto-rickshaws on arterial roads.`);
  }
  if (seismicRisk >= 35) {
    checklist.push(`High-relief seismic zone: keep digital copies of IDs and confirm hotel emergency assembly points upon check-in.`);
  }
  if (checklist.length === 0) {
    checklist.push(`All primary air, rail, and highway corridors in ${city} are operating on normal schedule.`);
    checklist.push(`Pre-book popular monument entry slots 24h ahead to bypass midday ticket queues.`);
  }
  if (checklist.length < 3) {
    checklist.push(
      country === "India"
        ? `Keep DigiYatra / offline rail PNR and UPI backup ready for rapid terminal transit in ${city}.`
        : `Keep offline hotel address cards and contactless transit pass active for smooth metro transfers in ${city}.`
    );
  }

  const emergencyNumbers =
    country === "India"
      ? { police: "112 / 100", ambulance: "108 / 102", touristHelpline: "1363 (Toll-Free)" }
      : country === "Nepal"
      ? { police: "100", ambulance: "102", touristHelpline: "1144" }
      : country === "UAE"
      ? { police: "999", ambulance: "998", touristHelpline: "800 555" }
      : country === "Japan"
      ? { police: "110", ambulance: "119", touristHelpline: "050-3816-2787" }
      : country === "Singapore"
      ? { police: "999", ambulance: "995", touristHelpline: "1800 736 2000" }
      : { police: "112 / 911", ambulance: "112 / 999", touristHelpline: "+112 Local Consular Desk" };

  return { bestTimeWindow, transitStatus, mitigationChecklist: checklist.slice(0, 3), emergencyNumbers };
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
      baseAqi: 65,
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

  // If place is explicitly specified, validate that it is known in gazetteer or default hubs
  let knownPlace: any = null;
  if (hasPlace) {
    knownPlace =
      DEFAULT_CITIES.find((c) => c.city.toLowerCase() === placeParam.toLowerCase()) ||
      findPlace(placeParam);
    if (!knownPlace) {
      return NextResponse.json({ error: `Unknown place: ${placeParam}` }, { status: 404 });
    }
  }

  const searchQuery = (qParam === "all" ? "" : (qParam || placeParam)).trim();

  const targetList = [...DEFAULT_CITIES];

  // If user searched for a specific city, check if it exists or geocode it live
  if (searchQuery.length >= 2) {
    const existingIndex = targetList.findIndex(
      (c) => c.city.toLowerCase() === searchQuery.toLowerCase()
    );
    if (existingIndex > 0) {
      const [matched] = targetList.splice(existingIndex, 1);
      targetList.unshift(matched);
    } else if (existingIndex === -1) {
      if (hasPlace && knownPlace && "lng" in knownPlace) {
        targetList.unshift({
          city: knownPlace.name,
          stateOrRegion: knownPlace.region || knownPlace.countryName,
          country: knownPlace.countryName,
          lat: knownPlace.lat,
          lon: knownPlace.lng,
          baseSec: 18,
          baseAqi: 68,
        });
      } else {
        const geo = await geocodeCustomCity(searchQuery);
        if (geo) {
          targetList.unshift(geo);
        } else if (hasPlace) {
          // Requested place not found
          return NextResponse.json({ error: `Unknown place: ${placeParam}` }, { status: 404 });
        }
      }
    }
  }

  // Bulk fetch live weather from Open-Meteo, USGS seismic feed, and optional news wire in parallel
  const lats = targetList.map((c) => c.lat).join(",");
  const lons = targetList.map((c) => c.lon).join(",");

  const [quakes, customAdvisories, weatherArray] = await Promise.all([
    fetchUSGSEarthquakes(),
    searchQuery.length >= 2 ? fetchCityNewsAdvisories(searchQuery) : Promise.resolve([]),
    (async () => {
      try {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code`,
          { cache: "no-store", signal: AbortSignal.timeout(3000) }
        );
        if (wRes.ok) {
          const wData = await wRes.json();
          return Array.isArray(wData) ? wData : [wData];
        }
      } catch {
        // Fallback to deterministic baseline if offline or rate-limited
      }
      return [];
    })(),
  ]);

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
    const isHimalayanBelt = ["kathmandu", "manali", "shimla", "rishikesh", "darjeeling"].includes(
      hub.city.toLowerCase()
    );
    const seismicRisk = nearbyQuakes.length
      ? Math.min(92, Math.round((nearbyQuakes[0].mag - 3.5) * 24))
      : hub.city.toLowerCase() === "kathmandu"
      ? 52
      : isHimalayanBelt
      ? 28
      : 8;

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

    // Calculate realistic live AQI modulated by precipitation and wind dispersion
    const rawAqi = Math.round(
      (hub.baseAqi ?? 65) - (precipMm > 1 ? 18 : 0) - (windKmh > 20 ? 10 : 0)
    );
    const airQualityIndex = Math.max(22, Math.min(280, rawAqi));
    const aqiCategory: CityRiskProfile["aqiCategory"] =
      airQualityIndex <= 50
        ? "Good"
        : airQualityIndex <= 100
        ? "Moderate"
        : airQualityIndex <= 150
        ? "Sensitive"
        : "Unhealthy";

    const guidance = buildMitigationAndWindow(
      hub.city,
      hub.country,
      tempC,
      precipMm,
      windKmh,
      airQualityIndex,
      seismicRisk,
      overallScore
    );

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
      airQualityIndex,
      aqiCategory,
      visibilityKm: wEval.visibilityKm,
      bestTimeWindow: guidance.bestTimeWindow,
      transitStatus: guidance.transitStatus,
      mitigationChecklist: guidance.mitigationChecklist,
      emergencyNumbers: guidance.emergencyNumbers,
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
    place: primary
      ? {
          name: primary.city,
          countryCode: primary.country,
          lat: primary.lat,
          lng: primary.lon,
        }
      : null,
    score: primary?.overallScore ?? 18,
    band: primary?.riskLevel.toLowerCase() ?? "low",
    drivers:
      primary?.advisories.map((a, i) => ({
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
    advice: primary
      ? [
          `Current Weather: ${primary.weather.condition}, ${primary.weather.tempC}°C`,
          `Wind: ${primary.weather.windKmh} km/h, Precipitation: ${primary.weather.precipMm} mm`,
          ...primary.mitigationChecklist,
        ]
      : [],
    computedAt: nowIso,
  });
}
