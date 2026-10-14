import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { findPlace } from "@/lib/geo/gazetteer";

export const dynamic = "force-dynamic";
export const GET = handler(async (_req, { session }) => {
  const travelers = await db.traveler.findMany({ where: { orgId: session!.oid }, orderBy: [{ exposureScore: "desc" }, { tripStart: "asc" }], take: 2000 });
  const pending = await db.checkinRequest.findMany({ where: { traveler: { orgId: session!.oid }, status: "pending", expiresAt: { gt: new Date() } }, select: { travelerId: true, token: true, createdAt: true } });
  const pm = new Map(pending.map((p) => [p.travelerId, p]));
  return json({ travelers: travelers.map((t) => ({ ...t, pendingCheckin: pm.get(t.id) ?? null })) });
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
