import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { AUTONOMY_LEVELS, LEVEL_INFO } from "@/lib/agent/policy";
import { agentMemoryStore } from "@/lib/agent/memory-store";

const Body = z.object({ level: z.enum(AUTONOMY_LEVELS) });
export const GET = handler(async (_req, { session }) => {
  let level = "L2";
  if (await isDbAvailable()) {
    try {
      const org = await db.organization.findUnique({ where: { id: session!.oid } });
      if (org?.autonomyLevel) level = org.autonomyLevel;
    } catch {}
  } else {
    level = agentMemoryStore.getAutonomyLevel(session?.oid);
  }
  return json({ level, levels: LEVEL_INFO });
}, { auth: "required" });
export const POST = handler(async (req, { session }) => {
  const { level } = Body.parse(await readJson(req));
  if (await isDbAvailable()) {
    try {
      await db.organization.update({ where: { id: session!.oid }, data: { autonomyLevel: level } });
      await db.auditEvent.create({ data: { actor: "USER", actorId: session!.uid, entity: "Policy", entityId: session!.oid, event: "autonomy_changed", data: JSON.stringify({ level }) } });
    } catch {}
  }
  agentMemoryStore.setAutonomyLevel(session?.oid, level);
  return json({ level });
}, { auth: "required", roles: ["owner", "admin"] });
