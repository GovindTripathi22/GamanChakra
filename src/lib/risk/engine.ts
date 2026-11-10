import { db, isDbAvailable } from "@/lib/db";
import { findPlace, haversineKm, allCities } from "@/lib/geo/gazetteer";
import { exposureScore, riskBand } from "@/lib/news/scoring";
import { CATEGORY_META, type NewsCategory, type Severity } from "@/lib/slm/labels";
import { RAW_DEMO_TRAVELERS } from "@/lib/demo/travelers-data";
import { getInMemoryNewsEvents } from "@/lib/news/pipeline";
import type { NewsEvent } from "@prisma/client";

export interface RiskSubject {
  type: "trip" | "traveler";
  id: string;
  orgId: string | null;
  ownerId?: string | null;
  name: string;
  destination: string;
  lat: number;
  lng: number;
  countryCode: string | null;
  start: Date;
  end: Date;
  transportMode?: string;
}

export interface Exposure {
  subject: RiskSubject;
  event: Pick<NewsEvent, "id" | "title" | "category" | "severity" | "impactScore" | "placeName" | "countryCode" | "lat" | "lng" | "radiusKm" | "publishedAt" | "url" | "source" | "provenance">;
  score: number;
  distanceKm: number;
  band: ReturnType<typeof riskBand>;
  reason: string;
}

/** Pure matcher: which subjects are exposed to which events (no DB access). */
export function matchExposures(events: Exposure["event"][], subjects: RiskSubject[], now = new Date(), minScore = 10): Exposure[] {
  const out: Exposure[] = [];
  for (const s of subjects) {
    for (const e of events) {
      if (e.lat == null || e.lng == null) {
        if (!(e.countryCode && s.countryCode && e.countryCode === s.countryCode)) continue;
      }
      const distanceKm = e.lat != null && e.lng != null ? haversineKm({ lat: e.lat, lng: e.lng }, s) : 9999;
      const score = exposureScore({
        eventImpact: e.impactScore, distanceKm, radiusKm: e.radiusKm, sameCountry: !!e.countryCode && e.countryCode === s.countryCode,
        category: e.category as NewsCategory, tripStart: s.start, tripEnd: s.end, eventAt: e.publishedAt, now,
      });
      if (score < minScore) continue;
      const when = s.start.getTime() <= now.getTime() ? "currently in" : `heading to ${s.destination} on ${s.start.toISOString().slice(0, 10)} —`;
      out.push({
        subject: s, event: e, score, distanceKm, band: riskBand(score),
        reason: `${s.name} is ${when} ${s.destination}; ${CATEGORY_META[e.category as NewsCategory].label.toLowerCase()} (${e.severity}) ${distanceKm < 9999 ? `${distanceKm} km away` : "in the same country"}.`,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Load every active trip & traveller as a risk subject; backfills trip coordinates from the gazetteer. */
export async function loadSubjects(orgId?: string | null, now = new Date()): Promise<RiskSubject[]> {
  const horizon = new Date(now.getTime() + 45 * 864e5);
  let travelers: any[] = [];
  const dbOk = await isDbAvailable();
  if (dbOk) {
    try {
      travelers = await db.traveler.findMany({
        where: { ...(orgId ? { orgId } : {}), tripEnd: { gt: new Date(now.getTime() - 864e5) }, tripStart: { lt: horizon } },
        take: 5000,
      });
    } catch (err) {
      console.warn("[engine] db.traveler.findMany failed, falling back to demo travelers", err);
    }
  }

  if (!travelers.length) {
    const nowMs = now.getTime();
    travelers = RAW_DEMO_TRAVELERS.map(([name, _dept, _home, dest, off, len, mode], idx) => {
      const p = findPlace(dest);
      return {
        id: `demo-traveler-${idx + 1}`,
        orgId: orgId ?? "demo-travel-co",
        name,
        destinationCity: p?.name ?? dest,
        destLat: p?.lat ?? 20.0,
        destLng: p?.lng ?? 77.0,
        tripStart: new Date(nowMs + off * 864e5),
        tripEnd: new Date(nowMs + (off + len) * 864e5),
        transportMode: mode,
      };
    });
  }

  const subjects: RiskSubject[] = travelers.map((t) => ({
    type: "traveler", id: t.id, orgId: t.orgId, name: t.name, destination: t.destinationCity, lat: t.destLat, lng: t.destLng,
    countryCode: findPlace(t.destinationCity)?.countryCode ?? null, start: t.tripStart instanceof Date ? t.tripStart : new Date(t.tripStart), end: t.tripEnd instanceof Date ? t.tripEnd : new Date(t.tripEnd), transportMode: t.transportMode,
  }));
  let trips: any[] = [];
  if (dbOk) {
    try {
      trips = await db.trip.findMany({ where: { status: { in: ["planned", "active"] }, ...(orgId ? { orgId } : {}) }, take: 2000, orderBy: { createdAt: "desc" } });
    } catch {
      /* fallback to empty trips if db offline */
    }
  }
  for (const t of trips) {
    let lat = t.destLat, lng = t.destLng;
    const place = findPlace(t.destination.split(/[|,>-]/)[0].trim());
    if ((lat == null || lng == null) && place) {
      lat = place.lat; lng = place.lng;
      await db.trip.update({ where: { id: t.id }, data: { destLat: lat, destLng: lng } }).catch(() => {});
    }
    if (lat == null || lng == null) continue;
    const start = t.startDate ? new Date(t.startDate) : t.createdAt;
    const end = t.endDate ? new Date(t.endDate) : new Date(start.getTime() + 5 * 864e5);
    subjects.push({ type: "trip", id: t.id, orgId: t.orgId, ownerId: t.ownerId, name: t.title, destination: t.destination, lat, lng, countryCode: place?.countryCode ?? null, start: Number.isNaN(start.getTime()) ? now : start, end: Number.isNaN(end.getTime()) ? new Date(now.getTime() + 5 * 864e5) : end });
  }
  return subjects;
}

export async function recentEvents(hours = 72, now = new Date()) {
  try {
    const dbOk = await isDbAvailable();
    if (dbOk) {
      return await db.newsEvent.findMany({
        where: { publishedAt: { gt: new Date(now.getTime() - hours * 36e5) }, impactScore: { gt: 0 } },
        orderBy: { impactScore: "desc" },
        take: 1500,
      });
    }
  } catch {}
  return getInMemoryNewsEvents();
}

/** Combine several event impacts into one 0–100 risk index (probabilistic OR). */
export function combineScores(scores: number[]): number {
  const p = scores.reduce((acc, s) => acc * (1 - Math.min(99, s) / 100), 1);
  return Math.round((1 - p) * 100);
}

export interface DestinationRisk {
  place: { name: string; countryCode: string; lat: number; lng: number } | null;
  score: number;
  band: ReturnType<typeof riskBand>;
  drivers: { id: string; title: string; category: string; severity: string; distanceKm: number; contribution: number; url: string; source: string; publishedAt: string; provenance: string }[];
  advice: string[];
  computedAt: string;
}

const ADVICE: Record<NewsCategory, string> = {
  natural_disaster: "Avoid the affected zone, follow local authorities and keep emergency contacts handy.",
  severe_weather: "Build buffer time into transfers and move outdoor plans indoors.",
  conflict_security: "Reconsider non-essential travel; register with your embassy and avoid crowds.",
  civil_unrest: "Avoid protest areas, pre-book transport and keep plans flexible.",
  transport_disruption: "Check bookings now; line up alternate flights, trains or road options.",
  health_outbreak: "Follow health advisories; carry repellent and check vaccination rules.",
  policy_advisory: "Re-check visa, permits and your government's advisory level before departure.",
  infrastructure_outage: "Carry cash, download offline maps and tickets.",
  crowd_event: "Expect crowds and road closures; start early and pre-book.",
  price_economy: "Lock in fares and hotels early; keep a bigger budget buffer.",
  travel_opportunity: "Good time to book — demand and deals are moving.",
  not_travel: "",
};

export function destinationRiskFrom(events: Exposure["event"][], target: { name: string; countryCode: string; lat: number; lng: number }, now = new Date()): DestinationRisk {
  const drivers: DestinationRisk["drivers"] = [];
  for (const e of events) {
    if (e.category === "travel_opportunity") continue;
    const distanceKm = e.lat != null && e.lng != null ? haversineKm({ lat: e.lat, lng: e.lng }, target) : 9999;
    
    // Strict geographic relevance: events beyond 2x radius do not contaminate distant cities
    if (e.lat != null && e.lng != null && distanceKm > (e.radiusKm || 200) * 2) {
      continue;
    }

    const contribution = exposureScore({
      eventImpact: e.impactScore, distanceKm, radiusKm: e.radiusKm, sameCountry: e.countryCode === target.countryCode,
      category: e.category as NewsCategory, tripStart: now, tripEnd: new Date(now.getTime() + 3 * 864e5), eventAt: e.publishedAt, now,
    });
    if (contribution >= 5) drivers.push({ id: e.id, title: e.title, category: e.category, severity: e.severity, distanceKm, contribution, url: e.url, source: e.source, publishedAt: e.publishedAt.toISOString(), provenance: e.provenance });
  }
  drivers.sort((a, b) => b.contribution - a.contribution);
  
  // Real calibrated score: primary local driver + small weight for secondary local drivers, capped at 88 max
  const primary = drivers[0]?.contribution ?? 0;
  const secondary = drivers.slice(1, 4).reduce((acc, d) => acc + d.contribution * 0.15, 0);
  const score = Math.min(88, Math.round(primary + secondary));
  
  const cats = [...new Set(drivers.slice(0, 5).map((d) => d.category as NewsCategory))];
  return { place: target, score, band: riskBand(score), drivers: drivers.slice(0, 12), advice: cats.map((c) => ADVICE[c]).filter(Boolean), computedAt: now.toISOString() };
}

export async function destinationRisk(name: string, now = new Date()): Promise<DestinationRisk> {
  const p = findPlace(name);
  if (!p) return { place: null, score: 0, band: "clear", drivers: [], advice: [], computedAt: now.toISOString() };
  const events = await recentEvents(96, now);
  return destinationRiskFrom(events, { name: p.name, countryCode: p.countryCode, lat: p.lat, lng: p.lng }, now);
}

const LEADERBOARD_CITY_NAMES = [
  "New Delhi", "Mumbai", "Bengaluru", "Goa", "Jaipur", "Kolkata", "Chennai", "Hyderabad",
  "Kochi", "Varanasi", "Srinagar", "Manali", "Pune", "Amravati", "Nagpur", "Ahmedabad",
  "Kathmandu", "Dubai", "Bangkok", "Paris", "Tokyo", "London", "Singapore", "New York"
];

/** Global risk leaderboard over prominent travel hubs (what the "risk radar" shows). */
export async function riskLeaderboard(limit = 12, now = new Date()) {
  const events = await recentEvents(96, now);
  const cities = LEADERBOARD_CITY_NAMES.map((name) => findPlace(name) || { name, countryCode: "IN", lat: 20.59, lng: 78.96 });

  // Get live Open-Meteo satellite weather and USGS telemetry for these cities
  const hubList = cities.map((c) => ({ id: c.name, name: c.name, lat: c.lat, lng: c.lng }));
  let telemetryMap = new Map<string, any>();
  try {
    const { getBatchLiveExposure } = await import("@/lib/risk/live-exposure");
    telemetryMap = await getBatchLiveExposure(hubList);
  } catch (e) {
    console.warn("[leaderboard] live exposure fallback:", e);
  }

  const rows = cities.map((c) => {
    const r = destinationRiskFrom(events, { name: c.name, countryCode: c.countryCode, lat: c.lat, lng: c.lng }, now);
    const tel = telemetryMap.get(c.name);

    // Realistic score: baseline from live telemetry (12-55), elevated only if genuine local hazard or incident
    const telScore = tel?.score ?? 18;
    const finalScore = Math.min(88, Math.max(telScore, r.score));
    const topTitle = r.drivers[0]?.title ?? tel?.driver ?? `${tel?.condition || "Clear & Mild"} in ${c.name}`;
    const topCat = r.drivers[0]?.category ?? (tel?.seismicRisk && tel.seismicRisk > 40 ? "natural_disaster" : "severe_weather");

    const enrichedDrivers = [
      ...r.drivers.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        severity: d.severity,
        source: d.source || "Live Regional News",
        url: d.url || "",
        distanceKm: d.distanceKm,
      })),
      ...(tel?.seismicWarning ? [{
        id: `quake-${c.name}`,
        title: tel.seismicWarning,
        category: "natural_disaster",
        severity: tel.seismicRisk > 50 ? "high" : "moderate",
        source: "USGS Real-Time Seismic",
        url: "https://earthquake.usgs.gov/",
        distanceKm: 0,
      }] : []),
      ...(tel?.condition ? [{
        id: `weather-${c.name}`,
        title: `${tel.condition} (${tel.tempC}°C, wind ${tel.windKmh} km/h${tel.precipMm > 0 ? `, rain ${tel.precipMm}mm` : ""})`,
        category: "severe_weather",
        severity: tel.score > 45 ? "moderate" : "low",
        source: "Open-Meteo Satellite Station",
        url: "https://open-meteo.com/",
        distanceKm: 0,
      }] : []),
    ];

    return {
      name: c.name,
      countryCode: c.countryCode,
      lat: c.lat,
      lng: c.lng,
      score: finalScore,
      band: riskBand(finalScore),
      top: topTitle,
      topCategory: topCat,
      weather: tel ? {
        tempC: tel.tempC,
        condition: tel.condition,
        windKmh: tel.windKmh,
        precipMm: tel.precipMm,
      } : { tempC: 28, condition: "Clear & Mild", windKmh: 12, precipMm: 0 },
      seismic: tel && tel.seismicRisk > 10 ? {
        risk: tel.seismicRisk,
        warning: tel.seismicWarning,
      } : undefined,
      drivers: enrichedDrivers.slice(0, 8),
      advice: r.advice.length ? r.advice : [
        (tel?.precipMm ?? 0) > 4 ? "Carry rain gear and build buffer time for traffic delays." : "Normal transit conditions; maintain standard situational awareness."
      ],
    };
  });

  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type { Severity };
