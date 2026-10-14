"use server";

import { generateJSON, CHAKRA_SYSTEM_PROMPT } from "@/lib/slm/generative";
import type { DayPlan, DisruptionEvent, DisruptionAnalysisResult, RecoveryOption, Activity } from "@/types/trip";
import { analyzeCascadingImpact, generateHeuristicRecoveries } from "@/lib/disruption-simulator";

export async function analyzeAndResolveDisruption(
  dayPlan: DayPlan,
  disruption: DisruptionEvent,
  destination: string
): Promise<DisruptionAnalysisResult> {
  const fallbackImpact = analyzeCascadingImpact(dayPlan, disruption);
  const fallbackOptions = generateHeuristicRecoveries(dayPlan, disruption, destination);

  try {
    const prompt = `You are the Voyage Autonomous Travel Control Tower and Capacity Engine.
A real-time travel disruption has occurred during an ongoing trip.
Analyze the cascading failure across the day's timeline and output 3 distinct, high-quality autonomous recovery options.

CONTEXT:
Destination: ${destination}
Day Number: ${dayPlan.day}
Theme: ${dayPlan.theme}
Current Activities:
${JSON.stringify(dayPlan.activities, null, 2)}

DISRUPTION EVENT:
Type: ${disruption.type}
Title: ${disruption.title}
Description: ${disruption.description}
Severity: ${disruption.severity}
Delay Minutes: ${disruption.delayMinutes || 60}

TASK:
1. Identify the cascading failures (time collisions, missed bookings, crowd choke points, weather danger).
2. Generate 3 actionable recovery strategies:
   - Option 1 (strategy: "reorder"): Smart Re-sequencing and dynamic time-shifting.
   - Option 2 (strategy: "substitute"): Off-peak indoor pivot or sheltered cultural micro-experience.
   - Option 3 (strategy: "buffer_relax"): Pacing preservation & recharge buffer.

Return ONLY a valid JSON object matching this schema:
{
  "impactSummary": "Brief overview of why the schedule broke",
  "cascadingFailures": [
    "Failure 1 description",
    "Failure 2 description"
  ],
  "options": [
    {
      "id": "rec-1",
      "title": "Title of Option 1",
      "strategy": "reorder",
      "badgeText": "Smart Re-sequence",
      "confidenceScore": 95,
      "explanation": "Clear explanation of how this fixes the day",
      "tradeOffSummary": "What is traded off or modified",
      "costDelta": { "amount": 0, "currency": "₹" },
      "updatedActivities": [
        // Full updated array of activities for the day with recalculated times, coordinates, and details
      ]
    }
  ]
}`;

    // Local generative SLM (Ollama) refines the plan when available; heuristics are the source of truth otherwise.
    const parsed = await generateJSON<any>([{ role: "system", content: CHAKRA_SYSTEM_PROMPT }, { role: "user", content: prompt }], { maxTokens: 900, timeoutMs: 15000 });
    if (!parsed) {
      return { disruption, impactSummary: fallbackImpact.impactSummary, cascadingFailures: fallbackImpact.cascadingFailures, options: fallbackOptions };
    }

    // Validate that options has at least 1 valid option with updatedActivities
    if (Array.isArray(parsed.options) && parsed.options.length > 0) {
      const sanitizedOptions: RecoveryOption[] = parsed.options.map((opt: any, idx: number) => {
        const baseActivities = opt.updatedActivities && opt.updatedActivities.length > 0
          ? opt.updatedActivities
          : fallbackOptions[idx]?.updatedActivities || dayPlan.activities;

        return {
          id: opt.id || `rec-ai-${idx + 1}`,
          title: opt.title || `Recovery Strategy ${idx + 1}`,
          strategy: (opt.strategy as "reorder" | "substitute" | "buffer_relax") || "reorder",
          badgeText: opt.badgeText || "AI Optimized",
          confidenceScore: typeof opt.confidenceScore === "number" ? opt.confidenceScore : 90 - idx * 4,
          explanation: opt.explanation || "Autonomous schedule re-flow to restore trip continuity.",
          tradeOffSummary: opt.tradeOffSummary || "Minor time shifts applied.",
          costDelta: opt.costDelta || { amount: 0, currency: "₹" },
          updatedActivities: baseActivities,
        };
      });

      return {
        disruption,
        impactSummary: parsed.impactSummary || fallbackImpact.impactSummary,
        cascadingFailures: parsed.cascadingFailures || fallbackImpact.cascadingFailures,
        options: sanitizedOptions,
      };
    }

    return {
      disruption,
      impactSummary: fallbackImpact.impactSummary,
      cascadingFailures: fallbackImpact.cascadingFailures,
      options: fallbackOptions,
    };
  } catch (error) {
    console.warn("Autonomous Control Tower fallback to deterministic heuristics:", error);
    return {
      disruption,
      impactSummary: fallbackImpact.impactSummary,
      cascadingFailures: fallbackImpact.cascadingFailures,
      options: fallbackOptions,
    };
  }
}

export async function getControlTowerOverview() {
  const { db } = await import("@/lib/db");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [trips, alerts, workflows, recentAudits] = await Promise.all([
    db.trip.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.alert.findMany({
      orderBy: { detectedAt: "desc" },
      take: 20,
    }),
    db.executionWorkflow.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const atRiskCount = trips.reduce(
    (acc, trip) => acc + (trip.items.some((i) => i.status === "at_risk") ? 1 : 0),
    0
  );

  return {
    metrics: {
      activeTrips: trips.length,
      atRiskTrips: atRiskCount,
      activeAlerts: alerts.length,
      activeWorkflows: workflows.filter((w) => !["SUCCEEDED", "FAILED", "COMPENSATED"].includes(w.state)).length,
    },
    trips,
    alerts,
    workflows,
    recentAudits,
  };
}

export async function triggerControlTowerTripScan(tripId: string) {
  const { pollTripGuardianItems } = await import("@/lib/guardian/poller");
  return await pollTripGuardianItems(tripId);
}

export async function dispatchAutonomousRecovery(params: {
  tripId: string;
  alertId?: string;
  itemId?: string;
  actionType: string;
  estimatedCostINR: number;
  autonomyLevel: "L1" | "L2";
}) {
  const { AutonomousExecutionEngine } = await import("@/lib/execution/workflow-engine");
  const uniqueKey = `wf-rec-${Date.now()}`;
  const wf = await AutonomousExecutionEngine.requestWorkflow({
    tripId: params.tripId,
    idempotencyKey: uniqueKey,
    actor: "SYSTEM",
    actorId: "control_tower_recovery",
    steps: [
      {
        stepIndex: 1,
        title: `Autonomous ${params.actionType} recovery`,
        provider: "hotel",
        operation: "create_reservation",
        payload: {
          destination: "recovery",
          checkIn: new Date().toISOString(),
          checkOut: new Date().toISOString(),
          roomType: "standard",
        },
      },
    ],
  });

  if (params.autonomyLevel === "L2") {
    return await AutonomousExecutionEngine.approveAndExecuteWorkflow(wf.workflow.id, "control_tower_auto");
  }

  return wf;
}

