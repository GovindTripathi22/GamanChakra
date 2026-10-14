import { db } from "@/lib/db";
import { findPlace, haversineKm, allCities } from "@/lib/geo/gazetteer";
import { exposureScore, riskBand } from "@/lib/news/scoring";
import { CATEGORY_META, type NewsCategory, type Severity } from "@/lib/slm/labels";
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
  const travelers = await db.traveler.findMany({
    where: { ...(orgId ? { orgId } : {}), tripEnd: { gt: new Date(now.getTime() - 864e5) }, tripStart: { lt: horizon } },
    take: 5000,
  });
  const subjects: RiskSubject[] = travelers.map((t) => ({
    type: "traveler", id: t.id, orgId: t.orgId, name: t.name, destination: t.destinationCity, lat: t.destLat, lng: t.destLng,
    countryCode: findPlace(t.destinationCity)?.countryCode ?? null, start: t.tripStart, end: t.tripEnd, transportMode: t.transportMode,
  }));
  const trips = await db.trip.findMany({ where: { status: { in: ["planned", "active"] }, ...(orgId ? { orgId } : {}) }, take: 2000, orderBy: { createdAt: "desc" } });
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
  return db.newsEvent.findMany({
    where: { publishedAt: { gt: new Date(now.getTime() - hours * 36e5) }, impactScore: { gt: 0 } },
    orderBy: { impactScore: "desc" },
    take: 1500,
  });
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
    const contribution = exposureScore({
      eventImpact: e.impactScore, distanceKm, radiusKm: e.radiusKm, sameCountry: e.countryCode === target.countryCode,
      category: e.category as NewsCategory, tripStart: now, tripEnd: new Date(now.getTime() + 3 * 864e5), eventAt: e.publishedAt, now,
    });
    if (contribution >= 5) drivers.push({ id: e.id, title: e.title, category: e.category, severity: e.severity, distanceKm, contribution, url: e.url, source: e.source, publishedAt: e.publishedAt.toISOString(), provenance: e.provenance });
  }
  drivers.sort((a, b) => b.contribution - a.contribution);
  const score = combineScores(drivers.slice(0, 8).map((d) => d.contribution));
  const cats = [...new Set(drivers.slice(0, 5).map((d) => d.category as NewsCategory))];
  return { place: target, score, band: riskBand(score), drivers: drivers.slice(0, 12), advice: cats.map((c) => ADVICE[c]).filter(Boolean), computedAt: now.toISOString() };
}

export async function destinationRisk(name: string, now = new Date()): Promise<DestinationRisk> {
  const p = findPlace(name);
  if (!p) return { place: null, score: 0, band: "clear", drivers: [], advice: [], computedAt: now.toISOString() };
  const events = await recentEvents(96, now);
  return destinationRiskFrom(events, { name: p.name, countryCode: p.countryCode, lat: p.lat, lng: p.lng }, now);
}

/** Global risk leaderboard over the gazetteer's cities (what the "risk radar" shows). */
export async function riskLeaderboard(limit = 12, now = new Date()) {
  const events = await recentEvents(96, now);
  const cities = allCities();
  const rows = cities.map((c) => {
    const r = destinationRiskFrom(events, { name: c.name, countryCode: c.countryCode, lat: c.lat, lng: c.lng }, now);
    return { name: c.name, countryCode: c.countryCode, lat: c.lat, lng: c.lng, score: r.score, band: r.band, top: r.drivers[0]?.title ?? null, topCategory: r.drivers[0]?.category ?? null };
  });
  return rows.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export type { Severity };
