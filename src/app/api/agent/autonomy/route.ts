import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { AUTONOMY_LEVELS, LEVEL_INFO } from "@/lib/agent/policy";

const Body = z.object({ level: z.enum(AUTONOMY_LEVELS) });
export const GET = handler(async (_req, { session }) => {
  const org = await db.organization.findUnique({ where: { id: session!.oid } });
  return json({ level: org?.autonomyLevel ?? "L2", levels: LEVEL_INFO });
}, { auth: "required" });
export const POST = handler(async (req, { session }) => {
  const { level } = Body.parse(await readJson(req));
  await db.organization.update({ where: { id: session!.oid }, data: { autonomyLevel: level } });
  await db.auditEvent.create({ data: { actor: "USER", actorId: session!.uid, entity: "Policy", entityId: session!.oid, event: "autonomy_changed", data: JSON.stringify({ level }) } });
  return json({ level });
}, { auth: "required", roles: ["owner", "admin"] });
