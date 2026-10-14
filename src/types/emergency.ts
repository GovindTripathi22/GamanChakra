import type { FactProvenance } from "@/lib/providers/types";

export type RiskLevel = "low" | "medium" | "high" | "extreme";

export type HazardType = 
  | "monsoon_landslide" 
  | "air_quality" 
  | "heatwave" 
  | "sea_state" 
  | "flash_flood" 
  | "altitude_chill";

export interface HazardItem {
  id: string;
  type: HazardType;
  title: string;
  severity: RiskLevel;
  zone: string;
  bufferAdjustmentMinutes: number;
  explanation: string;
  actionablePrep: string[];
  historicalPrecedent?: string;
  provenance: FactProvenance;
}

export interface RouteRiskAnalysis {
  destination: string;
  overallRiskLevel: RiskLevel;
  seasonContext: string;
  hazards: HazardItem[];
  totalRecommendedBufferMinutes: number;
  packingChecklist: string[];
  lastAssessedAt: string;
  provenance: FactProvenance;
}

export interface LocalPhrase {
  intent: "emergency_help" | "call_ambulance" | "allergy_medical" | "police_where" | "water_clean";
  english: string;
  nativeScript: string;
  phonetic: string;
  language: string;
}

export interface VerifiedFacility {
  name: string;
  category: "hospital_24x7" | "police_station" | "tourist_police" | "embassy";
  address: string;
  phone: string;
  emergencyDirectLine: string;
  distanceEstimateKm?: number;
  open24x7: boolean;
  notes?: string;
  provenance: FactProvenance;
}

export interface TravelerEmergencyProfile {
  name: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  medicalAllergies: string;
  policyNumber: string;
  insuranceHelpline?: string;
}

export interface OfflineEmergencyCard {
  tripId: string;
  destination: string;
  traveler: TravelerEmergencyProfile;
  nearestHospital: VerifiedFacility;
  nearestPolice: VerifiedFacility;
  touristPolice?: VerifiedFacility;
  embassy?: VerifiedFacility;
  allIndiaHelplines: Array<{
    code: string;
    number: string;
    purpose: string;
  }>;
  phrases: LocalPhrase[];
  offlineGeneratedAt: string;
  offlineCacheKey: string;
  provenance: FactProvenance;
}
