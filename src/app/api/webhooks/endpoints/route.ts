import { safeJson } from "@/lib/events/bus";
import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { newWebhookSecret } from "@/lib/webhooks";

export const GET = handler(async (_req, { session }) => {
  const eps = await db.webhookEndpoint.findMany({ where: { orgId: session!.oid }, orderBy: { createdAt: "desc" } });
  return json({ endpoints: eps.map((e) => ({ ...e, secret: `${e.secret.slice(0, 10)}…`, events: safeJson(e.events, []) })) });
}, { auth: "required", roles: ["owner", "admin"] });
/** Block obvious SSRF targets (loopback, link-local, private ranges) in production. */
function isPublicHost(u: string): boolean {
  try {
    const h = new URL(u).hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h === "0.0.0.0" || h === "[::1]") return false;
    return !/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  } catch { return false; }
}
const Body = z.object({
  url: z.string().url().max(500)
    .refine((u) => u.startsWith("https://") || process.env.NODE_ENV !== "production", "HTTPS required")
    .refine((u) => isPublicHost(u) || process.env.NODE_ENV !== "production", "Webhook host must be publicly reachable"),
  events: z.array(z.string().max(60)).max(20).default(["*"]),
});
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  const secret = newWebhookSecret();
  const ep = await db.webhookEndpoint.create({ data: { orgId: session!.oid, url: b.url, secret, events: JSON.stringify(b.events) } });
  return json({ endpoint: { ...ep, events: b.events }, secret, note: "Store this signing secret now — it is shown only once." }, 201);
}, { auth: "required", roles: ["owner", "admin"] });
export const DELETE = handler(async (req, { session }) => {
  const id = new URL(req.url).searchParams.get("id");
  const ep = id ? await db.webhookEndpoint.findUnique({ where: { id } }) : null;
  if (!ep || ep.orgId !== session!.oid) throw new HttpError(404, "Not found");
  await db.webhookEndpoint.delete({ where: { id: ep.id } });
  return json({ ok: true });
}, { auth: "required", roles: ["owner", "admin"] });
