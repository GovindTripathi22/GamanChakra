import { safeJson } from "@/lib/events/bus";
import { handler, json, HttpError } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { agentMemoryStore } from "@/lib/agent/memory-store";

export const dynamic = "force-dynamic";
export const GET = handler<{ id: string }>(async (_req, { session, params }) => {
  let run: any = null;
  if (await isDbAvailable()) {
    try {
      run = await db.agentRun.findUnique({ where: { id: params.id }, include: { steps: { orderBy: { idx: "asc" } }, tasks: { orderBy: { createdAt: "asc" } } } });
    } catch {}
  }
  if (!run) {
    run = agentMemoryStore.getRun(params.id);
  }
  if (!run || (run.orgId && run.orgId !== session!.oid)) throw new HttpError(404, "Run not found");
  return json({ run: { ...run, steps: (run.steps ?? []).map((s: any) => ({ ...s, input: safeJson(s.input, {}), output: safeJson(s.output, {}) })), tasks: (run.tasks ?? []).map((t: any) => ({ ...t, payload: safeJson(t.payload, {}), result: safeJson(t.result, null) })) } });
}, { auth: "required" });
