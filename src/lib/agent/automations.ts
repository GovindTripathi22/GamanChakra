import { z } from "zod";
import type { Exposure } from "@/lib/risk/engine";
import type { TaskSpec } from "./playbooks";
import { SEVERITY_RANK, NEWS_CATEGORIES, SEVERITIES, type Severity } from "@/lib/slm/labels";

/** No-code automation rules: WHEN a news exposure matches CONDITIONS, THEN run ACTIONS. */
export const RuleConditionsSchema = z.object({
  categories: z.array(z.enum(NEWS_CATEGORIES)).optional(),
  minSeverity: z.enum(SEVERITIES).optional(),
  minExposure: z.number().min(0).max(100).optional(),
  countries: z.array(z.string().length(2)).optional(),
  subjectTypes: z.array(z.enum(["trip", "traveler"])).optional(),
  keywords: z.array(z.string().min(2)).optional(),
});
export const RuleActionSchema = z.object({
  type: z.enum(["notify", "advisory", "checkin", "reroute", "escalate", "webhook", "compensation_claim", "reschedule", "hold_rebooking"]),
  note: z.string().max(200).optional(),
});
export const RuleSchema = z.object({
  name: z.string().min(3).max(80),
  trigger: z.enum(["news_event", "risk_threshold"]).default("news_event"),
  conditions: RuleConditionsSchema,
  actions: z.array(RuleActionSchema).min(1).max(6),
  enabled: z.boolean().default(true),
});
export type RuleInput = z.infer<typeof RuleSchema>;

export function ruleMatches(conditions: z.infer<typeof RuleConditionsSchema>, x: Exposure): boolean {
  const c = conditions;
  if (c.categories?.length && !c.categories.includes(x.event.category as never)) return false;
  if (c.minSeverity && SEVERITY_RANK[x.event.severity as Severity] < SEVERITY_RANK[c.minSeverity]) return false;
  if (c.minExposure != null && x.score < c.minExposure) return false;
  if (c.countries?.length && !(x.subject.countryCode && c.countries.map((s) => s.toUpperCase()).includes(x.subject.countryCode))) return false;
  if (c.subjectTypes?.length && !c.subjectTypes.includes(x.subject.type)) return false;
  if (c.keywords?.length && !c.keywords.some((k) => x.event.title.toLowerCase().includes(k.toLowerCase()))) return false;
  return true;
}

export function tasksFromRule(rule: { name: string; actions: z.infer<typeof RuleActionSchema>[] }, x: Exposure): TaskSpec[] {
  return rule.actions.map((a) => ({
    kind: a.type,
    title: `${rule.name}: ${a.type.replace("_", " ")} · ${x.subject.name}`,
    detail: a.note || x.reason,
    payload: { eventId: x.event.id, subjectId: x.subject.id, subjectType: x.subject.type, destination: x.subject.destination, score: x.score, category: x.event.category, eventTitle: x.event.title },
    source: `rule:${rule.name}`,
  }));
}

export const RULE_TEMPLATES: RuleInput[] = [
  { name: "Earthquake & cyclone duty-of-care", trigger: "news_event", conditions: { categories: ["natural_disaster"], minSeverity: "moderate", minExposure: 25 }, actions: [{ type: "checkin" }, { type: "escalate" }], enabled: true },
  { name: "Flight chaos auto-replan", trigger: "news_event", conditions: { categories: ["transport_disruption", "severe_weather"], minExposure: 30 }, actions: [{ type: "reroute" }, { type: "compensation_claim" }], enabled: true },
  { name: "Strike / bandh day planner", trigger: "news_event", conditions: { categories: ["civil_unrest"], minExposure: 30 }, actions: [{ type: "advisory" }, { type: "reschedule" }], enabled: true },
  { name: "Security incident lockdown", trigger: "news_event", conditions: { categories: ["conflict_security"], minSeverity: "high" }, actions: [{ type: "checkin" }, { type: "escalate" }, { type: "webhook" }], enabled: true },
  { name: "Visa & advisory watch", trigger: "news_event", conditions: { categories: ["policy_advisory"], minExposure: 20 }, actions: [{ type: "advisory" }], enabled: false },
];
