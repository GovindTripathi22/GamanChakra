import { safeJson } from "@/lib/events/bus";
import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { executeTask } from "@/lib/agent/executor";
import { agentMemoryStore } from "@/lib/agent/memory-store";
import { RAW_DEMO_TRAVELERS } from "@/lib/demo/travelers-data";

const Body = z.object({ travelerIds: z.array(z.string()).min(1).max(500), reason: z.string().max(200).optional() });

/** POST /api/checkins/bulk — mass "Are you safe?" check-in with one-tap links + WhatsApp deep links. */
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  const dbOk = await isDbAvailable();
  let travelers: any[] = [];
  if (dbOk) {
    try {
      travelers = await db.traveler.findMany({ where: { id: { in: b.travelerIds }, orgId: session!.oid } });
    } catch {}
  }
  if (!travelers.length) {
    travelers = b.travelerIds.map((id) => {
      const idx = parseInt(id.replace("demo-traveler-", ""), 10) - 1;
      const raw = RAW_DEMO_TRAVELERS[idx] || RAW_DEMO_TRAVELERS[0];
      return { id, name: raw ? raw[0] : "Traveller", phone: `+919800000000`, safetyStatus: "unknown" };
    });
  }

  const results: { travelerId: string; name: string; link?: string; whatsappLink?: string | null }[] = [];
  for (const t of travelers) {
    let taskId = "";
    const idempotencyKey = `bulk-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (dbOk) {
      try {
        const task = await db.agentTask.create({
          data: { orgId: session!.oid, subjectType: "traveler", subjectId: t.id, kind: "checkin", title: `Manual check-in: ${t.name}`, detail: b.reason ?? `Safety check requested by ${session!.name}`, status: "approved", decidedBy: session!.uid, decidedAt: new Date(), idempotencyKey },
        });
        taskId = task.id;
      } catch {}
    }
    if (!taskId) {
      const task = agentMemoryStore.createTask({
        orgId: session!.oid, subjectType: "traveler", subjectId: t.id, kind: "checkin", title: `Manual check-in: ${t.name}`, detail: b.reason ?? `Safety check requested by ${session!.name}`, status: "approved", idempotencyKey, autonomyLevel: "L2", payload: JSON.stringify({ phone: t.phone }),
      });
      taskId = task.id;
    }
    const done = await executeTask(taskId, session!.uid);
    const r = safeJson<Record<string, any>>(done.result, {});
    if (dbOk && t.safetyStatus !== "needs_help") {
      await db.traveler.update({ where: { id: t.id }, data: { safetyStatus: "unknown" } }).catch(() => {});
    }
    results.push({ travelerId: t.id, name: t.name, link: r.link, whatsappLink: r.whatsappLink });
  }
  return json({ sent: results.length, results });
}, { auth: "required", roles: ["owner", "admin", "agent"] });
