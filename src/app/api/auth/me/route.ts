import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = handler(async (_req, { session }) => {
  if (!session) return json({ user: null });
  const org = await db.organization.findUnique({ where: { id: session.oid }, select: { id: true, name: true, kind: true, plan: true, autonomyLevel: true } });
  return json({ user: { id: session.uid, name: session.name, email: session.email, role: session.role, plan: session.plan }, org });
});
