import { FactProvenance } from "@/lib/providers/types";

export type VerificationIssueCode =
  | "BUFFER_TOO_SHORT"
  | "VENUE_CLOSED"
  | "TRAIN_DAY_MISMATCH"
  | "WEATHER_RISK"
  | "PACE_OVERLOAD"
  | "UNVERIFIED_LOCATION";

export interface VerificationIssue {
  code: VerificationIssueCode;
  severity: "warning" | "critical";
  message: string;
  details: string;
  affectedActivityId: string;
}

export interface VerificationRecoveryOption {
  id: string;
  title: string;
  action: "shift_time" | "swap_order" | "replace_venue" | "switch_transit";
  explanation: string;
  tradeOff: string;
  confidence: number; // 0 - 100
  patch: {
    activityId: string;
    timeSlot?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    description?: string;
    logistics?: string;
    ticket_price?: string;
    category?: "sightseeing" | "food" | "culture" | "leisure" | "buffer";
  };
}

export interface ItemVerification {
  activityId: string;
  status: "verified" | "estimated" | "unverified" | "issue_flagged";
  provenance: FactProvenance;
  transitToNext?: {
    distanceKm: number;
    estimatedMinutes: number;
    mode: string;
    isBufferAdequate: boolean;
  };
  venueCheck?: {
    isOpen: boolean;
    operatingHours?: string;
    closedDays?: string[];
  };
  issue?: VerificationIssue;
  recoveryOptions: VerificationRecoveryOption[];
}

export interface VerifiedTripReport {
  tripId: string;
  verifiedAt: string;
  overallScore: number; // 0 - 100
  status: "verified" | "has_warnings" | "has_critical_issues";
  itemsVerifiedCount: number;
  issuesCount: number;
  criticalIssuesCount: number;
  warningsCount: number;
  itemVerifications: Record<string, ItemVerification>;
  summary: string;
}
