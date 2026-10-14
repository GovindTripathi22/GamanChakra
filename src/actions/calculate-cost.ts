"use server";

import { GeneratedTrip } from "@/types/trip";
import { CostBreakdown } from "@/types/cost";
import { calculateTripCost } from "@/lib/cost/engine";
import { logAuditEvent } from "@/lib/audit/logger";

export async function calculateTripCostAction(
  trip: GeneratedTrip,
  customSpendCap?: number,
  tripId: string = "trip_active",
  userId: string = "traveler_active"
): Promise<CostBreakdown> {
  const breakdown = calculateTripCost(trip, customSpendCap);

  // If over budget, record policy awareness audit event
  if (breakdown.budgetStatus === "exceeds_budget") {
    try {
      await logAuditEvent({
        actor: "SYSTEM",
        actorId: userId,
        entity: "Trip",
        entityId: tripId,
        event: "updated",
        data: {
          warning: "Spend cap overrun detected",
          expectedTotal: breakdown.expectedTotal,
          userBudgetCap: breakdown.userBudgetCap,
          overageAmount: breakdown.overageAmount,
          culprits: breakdown.overageCulprits.map((c) => c.title),
        },
      });
    } catch (e) {
      // Non-blocking logger
    }
  }

  return breakdown;
}
