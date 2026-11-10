import { handler, json } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { agentMemoryStore } from "@/lib/agent/memory-store";

export const GET = handler(async (_req, { session }) => {
  if (!session) return json({ user: null });
  let org: any = null;
  if (await isDbAvailable()) {
    try {
      org = await db.organization.findUnique({ where: { id: session.oid }, select: { id: true, name: true, kind: true, plan: true, autonomyLevel: true } });
    } catch {}
  }
  if (!org) {
    org = { id: session.oid, name: "Voyage Demo Org", kind: "company", plan: session.plan || "pro", autonomyLevel: agentMemoryStore.getAutonomyLevel(session.oid) };
  }
  return json({ user: { id: session.uid, name: session.name, email: session.email, role: session.role, plan: session.plan }, org });
});
