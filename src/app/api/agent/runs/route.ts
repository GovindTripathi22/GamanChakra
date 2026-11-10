import { handler, json } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { agentMemoryStore } from "@/lib/agent/memory-store";

export const dynamic = "force-dynamic";
export const GET = handler(async (_req, { session }) => {
  let runs: any[] = [];
  if (await isDbAvailable()) {
    try {
      runs = await db.agentRun.findMany({ where: { OR: [{ orgId: session!.oid }, { orgId: null }] }, orderBy: { startedAt: "desc" }, take: 30 });
    } catch {}
  }
  if (!runs.length) {
    runs = agentMemoryStore.listRuns(session!.oid);
  }
  return json({ runs });
}, { auth: "required" });
