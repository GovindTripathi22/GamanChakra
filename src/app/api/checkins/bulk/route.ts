import { safeJson } from "@/lib/events/bus";
import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { executeTask } from "@/lib/agent/executor";

const Body = z.object({ travelerIds: z.array(z.string()).min(1).max(500), reason: z.string().max(200).optional() });

/** POST /api/checkins/bulk — mass "Are you safe?" check-in with one-tap links + WhatsApp deep links. */
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  const travelers = await db.traveler.findMany({ where: { id: { in: b.travelerIds }, orgId: session!.oid } });
  const results: { travelerId: string; name: string; link?: string; whatsappLink?: string | null }[] = [];
  for (const t of travelers) {
    const task = await db.agentTask.create({
      data: { orgId: session!.oid, subjectType: "traveler", subjectId: t.id, kind: "checkin", title: `Manual check-in: ${t.name}`, detail: b.reason ?? `Safety check requested by ${session!.name}`, status: "approved", decidedBy: session!.uid, decidedAt: new Date(), idempotencyKey: `bulk-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
    });
    const done = await executeTask(task.id, session!.uid);
    const r = safeJson<Record<string, any>>(done.result, {});
    if (t.safetyStatus !== "needs_help") await db.traveler.update({ where: { id: t.id }, data: { safetyStatus: "unknown" } });
    results.push({ travelerId: t.id, name: t.name, link: r.link, whatsappLink: r.whatsappLink });
  }
  return json({ sent: results.length, results });
}, { auth: "required", roles: ["owner", "admin", "agent"] });
