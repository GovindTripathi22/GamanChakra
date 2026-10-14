import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { publish } from "@/lib/events/bus";

/** Public, token-scoped traveller check-in (no login needed — the link is the credential). */
export const GET = handler<{ token: string }>(async (_req, { params }) => {
  const c = await db.checkinRequest.findUnique({ where: { token: params.token }, include: { traveler: { select: { name: true, destinationCity: true } } } });
  if (!c) throw new HttpError(404, "Link not found");
  return json({ status: c.expiresAt < new Date() && c.status === "pending" ? "expired" : c.status, reason: c.reason, traveler: c.traveler, expiresAt: c.expiresAt });
});

const Body = z.object({ status: z.enum(["safe", "needs_help"]), message: z.string().max(500).optional() });
export const POST = handler<{ token: string }>(async (req, { params }) => {
  const b = Body.parse(await readJson(req));
  const c = await db.checkinRequest.findUnique({ where: { token: params.token }, include: { traveler: true } });
  if (!c) throw new HttpError(404, "Link not found");
  if (c.expiresAt < new Date()) throw new HttpError(410, "This check-in link has expired");
  await db.checkinRequest.update({ where: { id: c.id }, data: { status: b.status, message: b.message, respondedAt: new Date() } });
  await db.traveler.update({ where: { id: c.travelerId }, data: { safetyStatus: b.status, lastCheckinAt: new Date() } });
  if (b.status === "needs_help") {
    await db.notification.create({ data: { orgId: c.traveler.orgId, title: `🚨 ${c.traveler.name} needs help`, body: b.message || `Responded "needs help" to: ${c.reason}`, severity: "critical", link: "/duty-of-care" } });
  }
  await publish("checkin.update", { travelerId: c.travelerId, name: c.traveler.name, status: b.status, message: b.message ?? null }, c.traveler.orgId);
  return json({ ok: true, status: b.status });
}, { limit: "auth" });
