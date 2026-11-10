import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { agentMemoryStore } from "@/lib/agent/memory-store";

const Patch = z.object({ enabled: z.boolean().optional(), name: z.string().min(3).max(80).optional() });

export const PATCH = handler<{ id: string }>(async (req, { session, params }) => {
  const patchData = Patch.parse(await readJson(req));
  let r: any = null;
  if (await isDbAvailable()) {
    try {
      const existing = await db.automationRule.findUnique({ where: { id: params.id } });
      if (existing && existing.orgId === session!.oid) {
        r = await db.automationRule.update({ where: { id: params.id }, data: patchData });
      }
    } catch {}
  }
  if (!r) {
    r = agentMemoryStore.updateRule(params.id, patchData);
  }
  if (!r) throw new HttpError(404, "Rule not found");
  return json({ rule: r });
}, { auth: "required", roles: ["owner", "admin"] });

export const DELETE = handler<{ id: string }>(async (_req, { session, params }) => {
  let deleted = false;
  if (await isDbAvailable()) {
    try {
      const existing = await db.automationRule.findUnique({ where: { id: params.id } });
      if (existing && existing.orgId === session!.oid) {
        await db.automationRule.delete({ where: { id: params.id } });
        deleted = true;
      }
    } catch {}
  }
  if (!deleted) {
    deleted = agentMemoryStore.deleteRule(params.id);
  }
  return json({ ok: true });
}, { auth: "required", roles: ["owner", "admin"] });
