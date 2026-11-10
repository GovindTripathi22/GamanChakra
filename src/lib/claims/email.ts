import { ClaimCase, EmailDraft } from "@/types/claim";
import { getIncidentTypeLabel } from "./checklist";

export const DEFAULT_INSURER_EMAILS: Record<string, string> = {
  "TATA AIG": "travelclaims@tataaig.com",
  "HDFC ERGO": "travelclaims@hdfcergo.com",
  "ICICI Lombard": "claims@icicilombard.com",
  "Bajaj Allianz": "bagichelp@bajajallianz.co.in",
  "Care Health": "claims@careinsurance.com",
  "Star Health": "support@starhealth.in",
  "Niva Bupa": "customercare@nivabupa.com",
};

export function getDefaultInsurerEmail(insurerName?: string | null): string {
  if (!insurerName) return "claims@insurance-provider.com";
  return DEFAULT_INSURER_EMAILS[insurerName.trim()] || "claims@insurance-provider.com";
}

export interface BuildEmailDraftOptions {
  claim: ClaimCase;
  destination: string;
  travelerName?: string;
  tripDates?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Builds a structured, professional claim notification email for the traveler to review.
 * Stamped explicitly as draft_not_sent.
 */
export function buildClaimEmailDraft({
  claim,
  destination,
  travelerName = "Traveler",
  tripDates,
}: BuildEmailDraftOptions): EmailDraft {
  const incidentLabel = getIncidentTypeLabel(claim.incidentType);
  const insurer = claim.policyDetails?.insurerName || "Travel Insurer";
  const maskedRef = claim.policyDetails?.policyNumberLast4
    ? `****${claim.policyDetails.policyNumberLast4}`
    : "[Policy No. On File]";
  const to = claim.policyDetails?.insurerEmail || getDefaultInsurerEmail(claim.policyDetails?.insurerName);

  const datesStr =
    tripDates?.startDate && tripDates?.endDate
      ? `${tripDates.startDate} to ${tripDates.endDate}`
      : claim.incidentDate;

  // Build documentation breakdown
  const checklist = Array.isArray(claim.evidenceChecklist) ? claim.evidenceChecklist : [];
  const timeline = Array.isArray(claim.incidentTimeline) ? claim.incidentTimeline : [];

  const collectedItems = checklist.filter((i) => i.collected);
  const uncollectedItems = checklist.filter((i) => !i.collected);

  const collectedBullets =
    collectedItems.length > 0
      ? collectedItems.map((i) => `  [x] ${i.label}`).join("\n")
      : "  (None attached yet - to be attached before sending)";

  const uncollectedBullets =
    uncollectedItems.length > 0
      ? uncollectedItems.map((i) => `  [ ] ${i.label} (Pending from provider / follow-up)`).join("\n")
      : "  All standard checklist items assembled.";

  const timelineBullets =
    timeline.length > 0
      ? timeline.map((t) => `  - ${t.timestamp}: ${t.title} (${t.description})`).join("\n")
      : `  - ${claim.incidentDate}: Disruption occurred with ${claim.provider}`;

  const demoNotice = claim.isSimulatedDisruption
    ? "\n- DEMO SIMULATION NOTICE: This incident was generated from an interactive simulation demo and is NOT eligible as evidence for actual insurer reimbursement or claim submission."
    : "";

  const subject = `Travel Insurance Claim Request: ${incidentLabel} | Ref: ${maskedRef} | ${destination}`;

  const body = `Dear ${insurer} Claims Department,

I am writing to formally submit a travel insurance claim regarding a covered travel disruption that occurred during my trip to ${destination}.

1. CLAIMANT & POLICY DETAILS
- Insured Traveler: ${travelerName}
- Policy Reference: ${insurer} (${maskedRef})
- Travel Destination: ${destination}
- Dates of Journey: ${datesStr}

2. INCIDENT OVERVIEW
- Incident Type: ${incidentLabel}
- Date of Occurrence: ${claim.incidentDate}
- Carrier / Service Provider: ${claim.provider}
- Details: ${claim.description || `Disruption on journey to ${destination}`}${demoNotice}

3. INCIDENT TIMELINE
${timelineBullets}

4. EVIDENCE & ATTACHED DOCUMENTATION
Attached / Ready for submission:
${collectedBullets}

Pending / Available on request:
${uncollectedBullets}

Please confirm receipt of this email and assign an official Claim Reference / Case Number for future tracking. Should you require any supplementary forms or provider clarifications, kindly advise.

Kind regards,

${travelerName}
Contact Email: [Your Email]
Trip Reference: ${claim.tripId}
[Prepared via Voyage Mission Control Claims Autopilot - Drafted by Traveler for Independent Submission]
[IRDAI Regulatory Advisory: Policyholders should never pay processing fees or use QR codes promising claim disbursement. Grievance portal: https://bimabharosa.irdai.gov.in/]`;

  return {
    to,
    subject,
    body,
    status: "draft_not_sent",
    lastGeneratedAt: new Date().toISOString(),
  };
}

/**
 * Builds mailto URL for native email clients.
 */
export function buildMailtoUrl(emailDraft: EmailDraft): string {
  const encSubject = encodeURIComponent(emailDraft.subject);
  const encBody = encodeURIComponent(emailDraft.body);
  return `mailto:${emailDraft.to}?subject=${encSubject}&body=${encBody}`;
}

/**
 * Builds Gmail compose link for webmail users.
 */
export function buildGmailWebUrl(emailDraft: EmailDraft): string {
  const encTo = encodeURIComponent(emailDraft.to);
  const encSubject = encodeURIComponent(emailDraft.subject);
  const encBody = encodeURIComponent(emailDraft.body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSubject}&body=${encBody}`;
}
