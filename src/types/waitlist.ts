import { FactProvenance } from "@/lib/providers/types";

export type WaitlistQuota = "GNWL" | "RLWL" | "PQWL" | "TQWL" | "RAC";
export type TravelClass = "1A" | "2A" | "3A" | "3E" | "SL" | "CC" | "EC";

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
  quota?: WaitlistQuota;
  confirmationProbability: number; // 0 - 100
  confidenceLabel: "High probability" | "Medium probability" | "Low probability";
  trainType?: string;
  distanceKm?: number;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  basis: {
    sampleSize: number;
    seasonalityFactor: string;
    historicalClearanceRate: string;
    chartingTime: string;
  };
  factors?: {
    expectedClearanceBerths: number;
    classBerthPool: number;
    quota: string;
    seasonalityLabel: string;
    corridorDemandIndex: number;
    daysToDeparture: number;
    dataSource: string;
  };
  isRescueNeeded: boolean;
  alternatives: WaitlistAlternative[];
  alternateCorridorTrains?: Array<{
    trainNumber: string;
    trainName: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    trainType: string;
  }>;
  provenance: FactProvenance;
  evaluatedAt: string;
}
