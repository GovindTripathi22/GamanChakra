import { safeJson } from "@/lib/events/bus";
import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { registerNewAgentClient, revokeAgentApiKey } from "@/lib/protocol/agent-auth";

const Body = z.object({ name: z.string().min(2).max(60) });
const SCOPES = ["risk:read", "trip:read", "itinerary:verify", "cost:calculate", "disruption:evaluate", "emergency:read", "telemetry:read"];

/** Partner API keys for the Risk API and MCP endpoint. Only the SHA-256 hash is stored. */
export const GET = handler(async (_req, { session }) => {
  const keys = await db.agentClient.findMany({ where: { name: { startsWith: `${session!.oid}:` } }, orderBy: { createdAt: "desc" } });
  return json({ keys: keys.map((k) => ({ id: k.id, name: k.name.split(":").slice(1).join(":"), scopes: safeJson(k.scopes, []), isActive: k.isActive, createdAt: k.createdAt, rateLimit: k.rateLimit })) });
}, { auth: "required", roles: ["owner", "admin"] });
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  const k = await registerNewAgentClient(`${session!.oid}:${b.name}`, SCOPES, 0);
  return json({ id: k.id, apiKey: k.apiKey, scopes: SCOPES, note: "Copy this key now — it will not be shown again." }, 201);
}, { auth: "required", roles: ["owner", "admin"] });
export const DELETE = handler(async (req, { session }) => {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const k = await db.agentClient.findUnique({ where: { id } });
  if (!k || !k.name.startsWith(`${session!.oid}:`)) return json({ error: "Not found" }, 404);
  return json({ ok: await revokeAgentApiKey(id) });
}, { auth: "required", roles: ["owner", "admin"] });
