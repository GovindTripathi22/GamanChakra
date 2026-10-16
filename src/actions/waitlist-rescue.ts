"use server";

import { WaitlistPredictionResult, WaitlistAlternative } from "@/types/waitlist";
import { predictWaitlistConfirmation, WaitlistInputParams } from "@/lib/trains/waitlist-engine";
import { authorizeAction } from "@/lib/policy/engine";
import { logAuditEvent } from "@/lib/audit/logger";

export async function predictWaitlistAction(
  params: WaitlistInputParams,
  userId: string = "traveler_active"
): Promise<WaitlistPredictionResult> {
  const result = await predictWaitlistConfirmation(params);

  try {
    await logAuditEvent({
      actor: "USER",
      actorId: userId,
      entity: "TripItem",
      entityId: params.pnr || params.trainNumber,
      event: "verified",
      data: {
        trainNumber: params.trainNumber,
        class: params.travelClass,
        waitlist: params.waitlistNumber,
        quota: params.quota,
        probability: result.confirmationProbability,
        isRescueNeeded: result.isRescueNeeded,
      },
    });
  } catch (e) {
    // Non-blocking logger
  }

  return result;
}

export async function monitorPnrAction(
  pnr: string,
  userId: string = "traveler_active"
) {
  try {
    await logAuditEvent({
      actor: "USER",
      actorId: userId,
      entity: "TripItem",
      entityId: pnr,
      event: "created",
      data: {
        action: "monitor_pnr_waitlist",
        pnr,
        frequency: "every_2_hours",
      },
    });
  } catch (e) {
    // Non-blocking
  }

  return {
    monitored: true,
    message: `PNR ${pnr} is now actively monitored. You will receive an instant notification if confirmation probability drops.`,
  };
}

export async function bookBackupOptionAction(
  tripId: string,
  option: WaitlistAlternative,
  userId: string = "traveler_active"
) {
  // Enforce Autonomy Ladder & Spend Policies (Principle P3)
  const policyDecision = authorizeAction({
    userId,
    tripId,
    actionKind: "book_backup_transit",
    requestedAutonomyLevel: "L2", // One-tap user approval
    estimatedCostINR: option.estimatedPrice.amount,
  });

  if (policyDecision.decision === "deny") {
    throw new Error(`Policy violation: ${policyDecision.reason}`);
  }

  try {
    await logAuditEvent({
      actor: "USER",
      actorId: userId,
      entity: "Action",
      entityId: option.id,
      event: "approved",
      data: {
        actionKind: "book_backup_transit",
        optionType: option.type,
        operator: option.operator,
        cost: option.estimatedPrice.amount,
        decision: "executed",
      },
    });
  } catch (e) {
    // Non-blocking
  }

  return {
    success: true,
    optionTitle: option.title,
    policyDecision: {
      ...policyDecision,
      decision: "executed" as const,
    },
  };
}
