import type { Exposure } from "@/lib/risk/engine";
import type { TaskKind } from "./policy";
import { CATEGORY_META, SEVERITY_RANK, type NewsCategory, type Severity } from "@/lib/slm/labels";

export interface TaskSpec {
  kind: TaskKind;
  title: string;
  detail: string;
  payload: Record<string, unknown>;
  source: string; // playbook or rule name
}

/**
 * Playbooks: expert response plans per event category × exposure band.
 * Deterministic and auditable; the generative SLM (if running) only rephrases, never decides.
 */
export function playbookFor(x: Exposure): TaskSpec[] {
  const cat = x.event.category as NewsCategory;
  const sev = x.event.severity as Severity;
  const s = x.subject;
  const tasks: TaskSpec[] = [];
  const label = CATEGORY_META[cat].label;
  const base = { eventId: x.event.id, subjectId: s.id, subjectType: s.type, destination: s.destination, score: x.score };
  const isTraveler = s.type === "traveler";
  const startsSoon = s.start.getTime() - Date.now() < 3 * 864e5;
  const severe = SEVERITY_RANK[sev] >= 2;

  if (x.score >= 15) {
    tasks.push({ kind: "advisory", title: `${label} advisory for ${s.name}`, detail: x.reason, payload: { ...base }, source: "playbook:baseline" });
  }
  if (x.score >= 35) {
    tasks.push({ kind: "notify", title: `${x.band.toUpperCase()} risk: ${s.name} · ${s.destination}`, detail: x.event.title, payload: { ...base, severity: sev }, source: "playbook:baseline" });
  }
  if (isTraveler && x.score >= 45 && ["natural_disaster", "conflict_security", "civil_unrest", "severe_weather", "infrastructure_outage", "health_outbreak"].includes(cat)) {
    tasks.push({ kind: "checkin", title: `Safety check-in: ${s.name}`, detail: `Ask ${s.name} to confirm they are safe (${label.toLowerCase()} near ${s.destination}).`, payload: { ...base }, source: "playbook:duty-of-care" });
  }
  if ((cat === "transport_disruption" || (cat === "severe_weather" && /fog|snow|storm|cyclone|typhoon|flood/i.test(x.event.title)) || cat === "civil_unrest" || cat === "natural_disaster") && x.score >= 30 && (startsSoon || s.start.getTime() <= Date.now())) {
    tasks.push({ kind: "reroute", title: `Re-route options for ${s.name} → ${s.destination}`, detail: `Prepare alternate flight/train/bus/road options around the ${label.toLowerCase()}.`, payload: { ...base, disruptedMode: (s as { transportMode?: string }).transportMode ?? "flight", category: cat }, source: "playbook:continuity" });
  }
  if (cat === "transport_disruption" && x.score >= 55 && (startsSoon || s.start.getTime() <= Date.now())) {
    tasks.push({ kind: "hold_rebooking", title: `Hold best alternative seat for ${s.name}`, detail: "Place a 15-minute sandbox hold on the top-ranked alternative so it cannot sell out while you decide.", payload: { ...base, category: cat }, source: "playbook:continuity" });
  }
  if (s.type === "trip" && (cat === "severe_weather" || cat === "civil_unrest" || cat === "crowd_event") && x.score >= 30) {
    tasks.push({ kind: "reschedule", title: `Re-plan affected day in ${s.destination}`, detail: "Shift outdoor or exposed activities to safer slots and add buffers.", payload: { ...base, category: cat }, source: "playbook:itinerary" });
  }
  if (cat === "transport_disruption" && /cancel|delay|denied|grounded|divert/i.test(x.event.title) && x.score >= 30) {
    tasks.push({ kind: "compensation_claim", title: `Check compensation eligibility for ${s.name}`, detail: "Estimate DGCA / EU261 entitlement and draft the claim letter.", payload: { ...base, eventTitle: x.event.title }, source: "playbook:passenger-rights" });
  }
  if (severe && x.score >= 60) {
    tasks.push({ kind: "escalate", title: `Escalate: ${s.name} exposed to ${sev} ${label.toLowerCase()}`, detail: x.reason, payload: { ...base, severity: sev }, source: "playbook:escalation" });
  }
  if (x.score >= 35) {
    tasks.push({ kind: "webhook", title: `Partner webhook: risk.exposure for ${s.name}`, detail: "Deliver signed event to the organisation's endpoints.", payload: { ...base, event: "risk.exposure" }, source: "playbook:integrations" });
  }
  return tasks;
}
