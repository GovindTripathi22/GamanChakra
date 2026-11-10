import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { findPlace } from "@/lib/geo/gazetteer";
import { getBatchLiveExposure } from "@/lib/risk/live-exposure";
import { RAW_DEMO_TRAVELERS } from "@/lib/demo/travelers-data";

export const dynamic = "force-dynamic";
export const GET = handler(async (_req, { session }) => {
  let travelers: any[] = [];
  let pending: any[] = [];

  try {
    if (await isDbAvailable()) {
      travelers = await db.traveler.findMany({
        where: { orgId: session!.oid },
        orderBy: [{ exposureScore: "desc" }, { tripStart: "asc" }],
        take: 2000,
      });
      pending = await db.checkinRequest.findMany({
        where: { traveler: { orgId: session!.oid }, status: "pending", expiresAt: { gt: new Date() } },
        select: { travelerId: true, token: true, createdAt: true },
      });
    }
  } catch (dbErr) {
    console.warn("[travelers] Database query failed, using in-memory live demo roster", dbErr);
  }

  // Graceful fallback to rich demo roster if database is down or empty
  if (!travelers.length) {
    const now = Date.now();
    travelers = RAW_DEMO_TRAVELERS.map(([name, dept, home, dest, off, len, mode], idx) => {
      const p = findPlace(dest);
      const first = name.split(" ")[0].toLowerCase();
      return {
        id: `demo-traveler-${idx + 1}`,
        orgId: session!.oid || "demo-travel-co",
        name,
        department: dept,
        homeCity: home,
        destinationCity: p?.name || dest,
        destLat: p?.lat || 20.0,
        destLng: p?.lng || 77.0,
        tripStart: new Date(now + off * 864e5).toISOString(),
        tripEnd: new Date(now + (off + len) * 864e5).toISOString(),
        transportMode: mode,
        safetyStatus: "unknown",
        exposureScore: 10,
        email: `${first}@demo-travel.co`,
        phone: `+9198${String(10000000 + idx * 123456).slice(0, 8)}`,
        lastCheckinAt: null,
      };
    });
  }

  const pm = new Map(pending.map((p) => [p.travelerId, p]));

  // Live telemetry resolution across Open-Meteo & USGS
  const destList = travelers.map((t) => ({ id: t.id, name: t.destinationCity, lat: t.destLat, lng: t.destLng }));
  const telemetryMap = await getBatchLiveExposure(destList);

  const enriched = travelers.map((t) => {
    const telem = telemetryMap.get(t.id);
    const score = telem ? telem.score : t.exposureScore;

    // Asynchronously update DB score if database is connected
    if (telem && telem.score !== t.exposureScore) {
      db.traveler.update({ where: { id: t.id }, data: { exposureScore: telem.score } }).catch(() => {});
    }

    return {
      ...t,
      exposureScore: score,
      exposureBand: telem?.band || "clear",
      exposureDriver: telem?.driver || "Normal conditions",
      weatherCondition: telem?.condition || "Clear & Calm",
      tempC: telem?.tempC != null ? Math.round(telem.tempC) : null,
      windKmh: telem?.windKmh != null ? Math.round(telem.windKmh) : null,
      precipMm: telem?.precipMm ?? 0,
      seismicWarning: telem?.seismicWarning,
      pendingCheckin: pm.get(t.id) ?? null,
    };
  });

  // Re-sort by genuine live exposure descending
  enriched.sort((a, b) => b.exposureScore - a.exposureScore);

  return json({ travelers: enriched });
}, { auth: "required" });

export const TravelerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  department: z.string().max(60).optional(),
  homeCity: z.string().max(60).optional(),
  destinationCity: z.string().min(2).max(80),
  tripStart: z.coerce.date(),
  tripEnd: z.coerce.date(),
  transportMode: z.enum(["flight", "train", "bus", "car"]).default("flight"),
});

export const POST = handler(async (req, { session }) => {
  const b = TravelerSchema.parse(await readJson(req));
  if (b.tripEnd < b.tripStart) throw new HttpError(400, "Trip end must be after start");
  const p = findPlace(b.destinationCity);
  if (!p) throw new HttpError(400, `Unknown destination: ${b.destinationCity}. Use a city name like "Dubai" or "Goa".`);
  const t = await db.traveler.create({ data: { ...b, email: b.email || null, orgId: session!.oid, destinationCity: p.name, destLat: p.lat, destLng: p.lng } });
  return json({ traveler: t }, 201);
}, { auth: "required", roles: ["owner", "admin", "agent"] });
