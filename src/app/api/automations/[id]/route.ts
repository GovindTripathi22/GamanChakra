import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db } from "@/lib/db";

const Patch = z.object({ enabled: z.boolean().optional(), name: z.string().min(3).max(80).optional() });
async function own(id: string, orgId: string) {
  const r = await db.automationRule.findUnique({ where: { id } });
  if (!r || r.orgId !== orgId) throw new HttpError(404, "Rule not found");
  return r;
}
export const PATCH = handler<{ id: string }>(async (req, { session, params }) => {
  await own(params.id, session!.oid);
  const r = await db.automationRule.update({ where: { id: params.id }, data: Patch.parse(await readJson(req)) });
  return json({ rule: r });
}, { auth: "required", roles: ["owner", "admin"] });
export const DELETE = handler<{ id: string }>(async (_req, { session, params }) => {
  await own(params.id, session!.oid);
  await db.automationRule.delete({ where: { id: params.id } });
  return json({ ok: true });
}, { auth: "required", roles: ["owner", "admin"] });
