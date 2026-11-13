import { safeJson } from "@/lib/events/bus";
import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
/** GET /api/agent/tasks?status=proposed — the approvals inbox and action log */
export const GET = handler(async (req, { session }) => {
  const status = new URL(req.url).searchParams.get("status");
  const tasks = await db.agentTask.findMany({ where: { orgId: session!.oid, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: 200 });
  const eventIds = [...new Set(tasks.map((t) => t.newsEventId).filter(Boolean))] as string[];
  const events = await db.newsEvent.findMany({ where: { id: { in: eventIds } }, select: { id: true, title: true, category: true, severity: true, placeName: true, url: true, provenance: true } });
  const em = new Map(events.map((e) => [e.id, e]));
  return json({ tasks: tasks.map((t) => ({ ...t, payload: safeJson(t.payload, {}), result: safeJson(t.result, null), event: t.newsEventId ? em.get(t.newsEventId) ?? null : null })) });
}, { auth: "required" });
