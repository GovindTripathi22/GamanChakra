export type ClaimIncidentType =
  | "flight_delay"
  | "flight_cancellation"
  | "train_delay"
  | "baggage_delay"
  | "medical_emergency"
  | "trip_interruption"
  | "other";

export type EvidenceCategory =
  | "carrier_confirmation"
  | "ticket_boarding_pass"
  | "correspondence"
  | "expense_receipts"
  | "policy_specific"
  | "other";

export interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  category: EvidenceCategory;
  required: boolean;
  collected: boolean;
  notes?: string;
  guideUrl?: string;
}

export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  source: "scheduled" | "alert" | "carrier_notice" | "traveler_note";
}

export type ClaimCaseStatus =
  | "draft"
  | "email_prepared"
  | "sent_by_traveler"
  | "insurer_acknowledged"
  | "settled"
  | "rejected";

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  status: "draft_not_sent" | "sent_confirmed";
  lastGeneratedAt: string;
  sentConfirmedAt?: string;
}

export interface ClaimPolicyDetails {
  insurerName?: string;
  policyNumberLast4?: string; // Strictly last 4 alphanumeric characters only
  insurerEmail?: string;
}

export interface ClaimCase {
  id: string;
  tripId: string;
  ownerId: string;
  incidentType: ClaimIncidentType;
  incidentDate: string;
  provider: string;
  description?: string;
  isSimulatedDisruption: boolean;
  disruptionAlertId?: string;
  evidenceChecklist: EvidenceItem[];
  incidentTimeline: IncidentTimelineEvent[];
  policyDetails: ClaimPolicyDetails;
  status: ClaimCaseStatus;
  followUpDate?: string;
  emailDraft?: EmailDraft;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimInput {
  incidentType: ClaimIncidentType;
  incidentDate: string;
  provider: string;
  description?: string;
  isSimulatedDisruption?: boolean;
  disruptionAlertId?: string;
  insurerName?: string;
  policyNumberLast4?: string;
  insurerEmail?: string;
  followUpDate?: string;
  notes?: string;
  evidenceChecklist?: EvidenceItem[];
  incidentTimeline?: IncidentTimelineEvent[];
}

export interface UpdateClaimInput {
  incidentType?: ClaimIncidentType;
  incidentDate?: string;
  provider?: string;
  description?: string;
  insurerName?: string;
  policyNumberLast4?: string;
  insurerEmail?: string;
  followUpDate?: string;
  notes?: string;
  evidenceChecklist?: EvidenceItem[];
  incidentTimeline?: IncidentTimelineEvent[];
  status?: ClaimCaseStatus;
  emailDraft?: EmailDraft;
}

export const IRDAI_BIMA_BHAROSA_URL = "https://bimabharosa.irdai.gov.in/";
export const IRDAI_GRIEVANCE_FAQ_URL = "https://bimabharosa.irdai.gov.in/Home/FAQ";
export const TATA_AIG_CLAIM_DOCS_GUIDE_URL = "https://www.tataaig.com/travel-insurance/documents-required-for-travel-insurance";
