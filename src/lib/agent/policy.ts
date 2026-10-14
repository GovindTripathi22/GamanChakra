/**
 * Autonomy policy (P3 — controlled autonomy with human oversight).
 *   L0 Observe   — record risks only
 *   L1 Notify    — send alerts/advisories automatically
 *   L2 Propose   — + prepare check-ins, re-routes, claims for one-click approval   (default)
 *   L3 Act       — + execute reversible actions automatically (check-ins, re-plans, claim drafts)
 *   L4 Autopilot — + sandbox holds/rebooking without asking (still never spends real money)
 */
export const AUTONOMY_LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export type TaskKind = "notify" | "advisory" | "escalate" | "webhook" | "checkin" | "reroute" | "reschedule" | "compensation_claim" | "hold_rebooking";

export const TASK_POLICY: Record<TaskKind, { minAutoLevel: AutonomyLevel; reversible: boolean; label: string }> = {
  notify: { minAutoLevel: "L1", reversible: true, label: "Notify" },
  advisory: { minAutoLevel: "L1", reversible: true, label: "Send advisory" },
  escalate: { minAutoLevel: "L1", reversible: true, label: "Escalate to admin" },
  webhook: { minAutoLevel: "L1", reversible: true, label: "Partner webhook" },
  checkin: { minAutoLevel: "L3", reversible: true, label: "Safety check-in" },
  reroute: { minAutoLevel: "L3", reversible: true, label: "Re-route plan" },
  reschedule: { minAutoLevel: "L3", reversible: true, label: "Re-schedule day" },
  compensation_claim: { minAutoLevel: "L3", reversible: true, label: "Draft compensation claim" },
  hold_rebooking: { minAutoLevel: "L4", reversible: true, label: "Sandbox seat hold" },
};

export const LEVEL_INFO: Record<AutonomyLevel, { name: string; description: string }> = {
  L0: { name: "Observe", description: "Track risk silently. No messages, no actions." },
  L1: { name: "Notify", description: "Send alerts and advisories automatically." },
  L2: { name: "Propose", description: "Prepare check-ins, re-routes and claims for one-click approval." },
  L3: { name: "Act", description: "Run reversible actions automatically; ask before anything binding." },
  L4: { name: "Autopilot", description: "Also place sandbox holds and re-bookings without asking." },
};

export function levelIndex(l: string): number {
  const i = AUTONOMY_LEVELS.indexOf(l as AutonomyLevel);
  return i < 0 ? 2 : i;
}

export function decide(kind: TaskKind, level: string): "execute" | "propose" | "record" {
  if (levelIndex(level) === 0) return "record";
  if (levelIndex(level) >= levelIndex(TASK_POLICY[kind].minAutoLevel)) return "execute";
  return "propose";
}
