import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const GET = handler(async (_req, { session }) => {
  const runs = await db.agentRun.findMany({ where: { OR: [{ orgId: session!.oid }, { orgId: null }] }, orderBy: { startedAt: "desc" }, take: 30 });
  return json({ runs });
}, { auth: "required" });
