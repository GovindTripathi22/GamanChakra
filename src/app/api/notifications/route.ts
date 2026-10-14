import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const GET = handler(async (_req, { session }) => {
  const where = { OR: [{ orgId: session!.oid }, { userId: session!.uid }] };
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ]);
  return json({ items, unread });
}, { auth: "required" });
export const POST = handler(async (_req, { session }) => {
  await db.notification.updateMany({ where: { OR: [{ orgId: session!.oid }, { userId: session!.uid }], readAt: null }, data: { readAt: new Date() } });
  return json({ ok: true });
}, { auth: "required" });
