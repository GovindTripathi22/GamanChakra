import { safeJson } from "@/lib/events/bus";
import { handler, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { RuleSchema, RULE_TEMPLATES } from "@/lib/agent/automations";

export const dynamic = "force-dynamic";
export const GET = handler(async (_req, { session }) => {
  const rules = await db.automationRule.findMany({ where: { orgId: session!.oid }, orderBy: { createdAt: "asc" } });
  return json({ rules: rules.map((r) => ({ ...r, conditions: safeJson(r.conditions, {}), actions: safeJson(r.actions, []) })), templates: RULE_TEMPLATES });
}, { auth: "required" });
export const POST = handler(async (req, { session }) => {
  const b = RuleSchema.parse(await readJson(req));
  const r = await db.automationRule.create({ data: { orgId: session!.oid, name: b.name, trigger: b.trigger, enabled: b.enabled, conditions: JSON.stringify(b.conditions), actions: JSON.stringify(b.actions) } });
  return json({ rule: { ...r, conditions: b.conditions, actions: b.actions } }, 201);
}, { auth: "required", roles: ["owner", "admin"] });
