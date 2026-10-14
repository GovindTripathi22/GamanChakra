import { FactProvenance } from "@/lib/providers/types";

export interface WaitlistAlternative {
  id: string;
  type: "alternate_train" | "tatkal_alert" | "intercity_bus" | "direct_cab";
  title: string;
  badge: string;
  operator: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  estimatedPrice: { amount: number; currency: string };
  availabilityStatus: string;
  confirmationChancePercent?: number;
  tradeOff: string;
  tatkalOpenTime?: string;
  actionLabel: string;
}

export interface WaitlistPredictionResult {
  pnr?: string;
  trainNumber: string;
  trainName: string;
  originStation: string;
  destinationStation: string;
  travelDate: string;
  travelClass: string;
  waitlistNumber: number;
  confirmationProbability: number; // 0 - 100
  confidenceLabel: "High probability" | "Medium probability" | "Low probability";
  basis: {
    sampleSize: number;
    seasonalityFactor: string;
    historicalClearanceRate: string;
    chartingTime: string;
  };
  isRescueNeeded: boolean;
  alternatives: WaitlistAlternative[];
  provenance: FactProvenance;
  evaluatedAt: string;
}
