"use server";

import {
  calculateTrueCost,
  CalculateCostInput,
  TrueCostResult,
  calculateTripCost,
} from "@/lib/cost/engine";
import type { GeneratedTrip } from "@/types/trip";
import type { CostBreakdown } from "@/types/cost";

export async function calculateCostAction(
  input: CalculateCostInput | string,
  days?: number,
  travelers?: number,
  budget?: number
): Promise<TrueCostResult> {
  if (typeof input === "string") {
    return calculateTrueCost({
      destination: input,
      days: days || 3,
      travelers: travelers || 1,
      budget: budget,
      currency: "INR",
    });
  }
  return calculateTrueCost({
    ...input,
    currency: "INR",
  });
}

export async function calculateTripCostAction(
  trip: GeneratedTrip,
  customSpendCap?: number
): Promise<CostBreakdown> {
  return calculateTripCost(trip, customSpendCap);
}
