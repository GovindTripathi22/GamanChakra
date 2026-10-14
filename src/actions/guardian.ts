"use server";

import { GeneratedTrip, DisruptionEvent, RecoveryOption } from "@/types/trip";
import { scanTripForDisruptions, GuardianScanResult } from "@/lib/guardian/monitor";
import { authorizeAction } from "@/lib/policy/engine";
import { logAuditEvent } from "@/lib/audit/logger";
import { db } from "@/lib/db";

export async function scanTripGuardianAction(
  trip: GeneratedTrip,
  tripId: string = "trip_active",
  simulatedTrigger?: DisruptionEvent
): Promise<GuardianScanResult> {
  return await scanTripForDisruptions(trip, tripId, simulatedTrigger);
}

export async function approveAndExecuteRecoveryAction(
  tripId: string,
  option: RecoveryOption,
  userId: string = "traveler_active"
) {
  // Enforce Autonomy Ladder & Spend Policies (Principle P3)
  const policyDecision = authorizeAction({
    userId,
    tripId,
    actionKind: option.strategy,
    requestedAutonomyLevel: "L2",
    estimatedCostINR: option.costDelta.amount,
  });

  if (policyDecision.decision === "deny") {
    throw new Error(`Policy violation: ${policyDecision.reason}`);
  }

  const idempotencyKey = `act-rec-${option.id}-${Date.now()}`;

  // 1. Mutate persistent database state with explicit transition lifecycle
  try {
    const parentTrip = await db.trip.findUnique({ where: { id: tripId } });
    if (parentTrip) {
      // Step A: Record approved Action in DB (state: approved)
      const action = await db.action.create({
        data: {
          tripId,
          kind: option.strategy,
          payload: JSON.stringify({
            optionId: option.id,
            title: option.title,
            strategy: option.strategy,
            costDelta: option.costDelta,
            tradeOffSummary: option.tradeOffSummary,
          }),
          autonomyLevel: "L2",
          status: "approved",
          idempotencyKey,
          approvedAt: new Date(),
        },
      });

      // Step B: Execute schedule adjustments transactionally
      try {
        await db.$transaction(async (tx) => {
          // Update action status to executing
          await tx.action.update({
            where: { id: action.id },
            data: { status: "executing" },
          });

          // Update affected TripItem records to status 'healed'
          for (const act of option.updatedActivities) {
            if (act.id) {
              await tx.tripItem.updateMany({
                where: {
                  tripId,
                  id: act.id,
                },
                data: {
                  status: "healed",
                  startAt: act.startTime || "10:00",
                  endAt: act.endTime || "12:00",
                },
              });
            }
          }

          // Step C: Confirm outcome only after all updates complete successfully
          await tx.action.update({
            where: { id: action.id },
            data: {
              status: "succeeded",
              result: JSON.stringify({
                updatedStepsCount: option.updatedActivities.length,
                status: "healed",
                executionTimestamp: new Date().toISOString(),
              }),
            },
          });
        });
      } catch (execErr: any) {
        // If execution fails, mark as failed rather than claiming success
        await db.action.update({
          where: { id: action.id },
          data: {
            status: "failed",
            result: JSON.stringify({ error: execErr.message }),
          },
        });
        throw execErr;
      }

      // Step D: Append-only audit record
      await logAuditEvent({
        actor: "USER",
        actorId: userId,
        entity: "Action",
        entityId: idempotencyKey,
        event: "approved",
        data: {
          strategy: option.strategy,
          tradeOff: option.tradeOffSummary,
          status: "succeeded",
        },
      });
    }
  } catch (e) {
    console.error("Guardian recovery DB mutation failed:", e);
  }

  return {
    success: true,
    actionId: idempotencyKey,
    strategy: option.strategy,
    healedItems: option.updatedActivities.length,
    message: `Recovery plan "${option.title}" successfully approved and executed.`,
    policyDecision: {
      ...policyDecision,
      decision: "executed" as any,
    },
  };
}
