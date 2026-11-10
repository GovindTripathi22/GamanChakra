import { ClaimIncidentType, EvidenceItem } from "@/types/claim";

/**
 * Sanitizes policy number input so that only the last 4 characters are ever stored.
 * Enforces privacy protection (no full policy numbers stored).
 */
export function sanitizePolicyNumber(input?: string | null): string {
  if (!input) return "";
  const normalized = typeof input.normalize === "function" ? input.normalize("NFKC") : input;
  const cleaned = normalized.trim().replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(-4).toUpperCase();
}

/**
 * Returns a category-specific evidence checklist tailored to the incident type.
 * Requirement: For flight delay, include carrier confirmation, ticket/boarding pass,
 * relevant correspondence, and expense receipts. Highlight policy-specific requirements.
 */
export function generateEvidenceChecklist(
  incidentType: ClaimIncidentType,
  provider: string = "Carrier"
): EvidenceItem[] {
  const p = provider.trim() || "Carrier";

  switch (incidentType) {
    case "flight_delay":
      return [
        {
          id: "carrier-delay-cert",
          label: "Carrier Written Delay Confirmation",
          description: `Official written statement or delay certificate from ${p} on letterhead, official SMS, or email stating the exact delay duration and root cause (operational, technical, or ATC).`,
          category: "carrier_confirmation",
          required: true,
          collected: false,
          guideUrl: "https://www.tataaig.com/travel-insurance/documents-required-for-travel-insurance",
        },
        {
          id: "flight-ticket-boarding-pass",
          label: "Flight Ticket & Boarding Pass(es)",
          description: "Original flight e-ticket (with booking reference/PNR) and physical or digital boarding pass(es) for all affected travel sectors.",
          category: "ticket_boarding_pass",
          required: true,
          collected: false,
        },
        {
          id: "carrier-correspondence",
          label: "Carrier Correspondence & Notifications",
          description: `All electronic correspondence with ${p}, including schedule change alerts, delay announcements, or customer support ticket emails.`,
          category: "correspondence",
          required: false,
          collected: false,
        },
        {
          id: "delay-expense-receipts",
          label: "Itemized Expense Receipts",
          description: "Itemized receipts for reasonable food, refreshments, essential transit, or hotel accommodation incurred directly while waiting during the delay.",
          category: "expense_receipts",
          required: false,
          collected: false,
        },
        {
          id: "policy-specific-delay-check",
          label: "Policy Terms Confirmation (Traveler Verification)",
          description: "Traveler must verify their policy terms: check whether the delay exceeds your policy's time threshold (commonly 4-6 hours) and check any per-hour allowance caps.",
          category: "policy_specific",
          required: true,
          collected: false,
        },
      ];

    case "flight_cancellation":
      return [
        {
          id: "carrier-cancellation-cert",
          label: "Carrier Written Cancellation Notice",
          description: `Official letter or notification from ${p} stating cancellation原因 (reason) and whether alternate flights were offered.`,
          category: "carrier_confirmation",
          required: true,
          collected: false,
        },
        {
          id: "flight-ticket-and-replacement",
          label: "Original Ticket & Alternate Rebooking Voucher",
          description: "Original e-ticket along with proof of alternate transport purchased or refund voucher issued by the carrier.",
          category: "ticket_boarding_pass",
          required: true,
          collected: false,
        },
        {
          id: "carrier-correspondence",
          label: "Carrier Correspondence & Refund Requests",
          description: `Written communication with ${p} regarding refunds, denied boarding compensation, or re-routing options.`,
          category: "correspondence",
          required: false,
          collected: false,
        },
        {
          id: "cancellation-expense-receipts",
          label: "Out-of-Pocket Expense Receipts",
          description: "Itemized bills for necessary overnight accommodation, ground transport, and non-refundable forfeited prepaid bookings.",
          category: "expense_receipts",
          required: false,
          collected: false,
        },
        {
          id: "policy-specific-cancellation-check",
          label: "Policy Cancellation Clause Confirmation",
          description: "Traveler must confirm policy-specific covered perils (e.g. medical, weather, carrier insolvency) and verify submission deadline.",
          category: "policy_specific",
          required: true,
          collected: false,
        },
      ];

    case "train_delay":
      return [
        {
          id: "rail-delay-certificate",
          label: "Railway Delay Certificate / TDR Acknowledgment",
          description: `Official delay certificate from ${p} (e.g. IRCTC / Deutsche Bahn) or Ticket Deposit Receipt (TDR) filed with the rail authority.`,
          category: "carrier_confirmation",
          required: true,
          collected: false,
        },
        {
          id: "train-ticket-pnr",
          label: "Original Train Ticket & PNR Copy",
          description: "Confirmed train reservation showing PNR, coach, seat numbers, and scheduled departure/arrival times.",
          category: "ticket_boarding_pass",
          required: true,
          collected: false,
        },
        {
          id: "rail-notifications",
          label: "Railway SMS Alerts & Reschedule Notices",
          description: "Official broadcast SMS or digital notices received from the railway operations authority.",
          category: "correspondence",
          required: false,
          collected: false,
        },
        {
          id: "rail-alternate-expenses",
          label: "Alternate Transport & Refreshment Receipts",
          description: "Receipts for emergency alternate transport (buses, cabs) or meals purchased due to significant rail delay.",
          category: "expense_receipts",
          required: false,
          collected: false,
        },
        {
          id: "policy-specific-rail-check",
          label: "Policy Rail Delay Clause Confirmation",
          description: "Traveler must verify whether their domestic or international policy covers surface rail transport delays.",
          category: "policy_specific",
          required: true,
          collected: false,
        },
      ];

    case "baggage_delay":
      return [
        {
          id: "baggage-pir-report",
          label: "Property Irregularity Report (PIR)",
          description: `Original stamped PIR report issued by ${p} baggage services desk at destination airport upon arrival.`,
          category: "carrier_confirmation",
          required: true,
          collected: false,
        },
        {
          id: "baggage-tags-boarding-pass",
          label: "Baggage Claim Tag Stubs & Boarding Pass",
          description: "Original baggage barcode tags attached to your ticket/passport sleeve and matching flight boarding passes.",
          category: "ticket_boarding_pass",
          required: true,
          collected: false,
        },
        {
          id: "baggage-delivery-proof",
          label: "Delivery Acknowledgment Slip",
          description: "Courier delivery acknowledgment or airline release form recording the exact date and time delayed bags were returned.",
          category: "correspondence",
          required: false,
          collected: false,
        },
        {
          id: "emergency-purchases-receipts",
          label: "Emergency Essential Items Receipts",
          description: "Itemized receipts for essential emergency purchases (toiletries, change of clothes, medication) made during the baggage delay period.",
          category: "expense_receipts",
          required: true,
          collected: false,
        },
        {
          id: "policy-specific-baggage-check",
          label: "Policy Baggage Delay Threshold Confirmation",
          description: "Traveler must verify the minimum baggage delay duration (usually >12 or >24 hours) and daily allowance cap under their policy.",
          category: "policy_specific",
          required: true,
          collected: false,
        },
      ];

    case "medical_emergency":
      return [
        {
          id: "medical-report",
          label: "Treating Doctor's Medical Report & Diagnosis",
          description: "Comprehensive medical summary from registered hospital/clinic detailing symptoms, diagnosis, treatment, and travel fitness advice.",
          category: "carrier_confirmation",
          required: true,
          collected: false,
        },
        {
          id: "medical-itinerary-tickets",
          label: "Original Travel Itinerary & Proof of Travel",
          description: "Valid passport entry/exit stamps or domestic travel tickets confirming you were traveling when the medical event occurred.",
          category: "ticket_boarding_pass",
          required: true,
          collected: false,
        },
        {
          id: "tpa-intimation-records",
          label: "Insurer / TPA Prior Authorization Reference",
          description: "Case reference number or email correspondence from the insurer's Third-Party Administrator (TPA) emergency assistance desk.",
          category: "correspondence",
          required: true,
          collected: false,
        },
        {
          id: "hospital-bills-receipts",
          label: "Itemized Hospital Invoices & Payment Receipts",
          description: "Original break-up of physician fees, diagnostics, medications, and hospital room charges with payment proofs.",
          category: "expense_receipts",
          required: true,
          collected: false,
        },
        {
          id: "policy-specific-medical-check",
          label: "Policy Pre-Existing Condition & Deductibles Confirmation",
          description: "Traveler must confirm deductible amounts and verify that the medical condition is not subject to pre-existing condition exclusions.",
          category: "policy_specific",
          required: true,
          collected: false,
        },
      ];

    case "trip_interruption":
    case "other":
    default:
      return [
        {
          id: "provider-incident-confirmation",
          label: "Provider Official Statement / Incident Confirmation",
          description: `Written document from ${p} detailing the incident, cancellation, or interruption.`,
          category: "carrier_confirmation",
          required: true,
          collected: false,
        },
        {
          id: "booking-tickets",
          label: "Original Booking Confirmations & Invoices",
          description: "Paid booking confirmations and vouchers for all impacted transport, stay, and excursion items.",
          category: "ticket_boarding_pass",
          required: true,
          collected: false,
        },
        {
          id: "provider-correspondence",
          label: "Written Correspondence & Recovery Attempts",
          description: "Records of correspondence with the service provider regarding cancellation policies, credits, or refunds.",
          category: "correspondence",
          required: false,
          collected: false,
        },
        {
          id: "interruption-expenses",
          label: "Incurred Expenses & Forfeited Payment Proofs",
          description: "Itemized receipts for non-refundable expenses and additional costs incurred to return home or continue the trip.",
          category: "expense_receipts",
          required: false,
          collected: false,
        },
        {
          id: "policy-specific-general-check",
          label: "Policy Coverage & Claim Deadline Confirmation",
          description: "Traveler must verify policy terms, covered disruption reasons, deductibles, and claim filing time limits.",
          category: "policy_specific",
          required: true,
          collected: false,
        },
      ];
  }
}

/**
 * Returns the list of evidence items that are marked as required or recommended but not yet collected.
 */
export function getMissingEvidence(checklist?: EvidenceItem[] | null): {
  missingRequired: EvidenceItem[];
  missingRecommended: EvidenceItem[];
  totalCollected: number;
  totalItems: number;
} {
  const missingRequired: EvidenceItem[] = [];
  const missingRecommended: EvidenceItem[] = [];
  let totalCollected = 0;

  const list = Array.isArray(checklist) ? checklist : [];

  for (const item of list) {
    if (item && item.collected) {
      totalCollected++;
    } else if (item) {
      if (item.required) {
        missingRequired.push(item);
      } else {
        missingRecommended.push(item);
      }
    }
  }

  return {
    missingRequired,
    missingRecommended,
    totalCollected,
    totalItems: list.length,
  };
}

/**
 * Human-readable label for claim incident types.
 */
export function getIncidentTypeLabel(type: ClaimIncidentType): string {
  switch (type) {
    case "flight_delay":
      return "Flight Delay";
    case "flight_cancellation":
      return "Flight Cancellation";
    case "train_delay":
      return "Train Delay / Cancellation";
    case "baggage_delay":
      return "Baggage Delay / Loss";
    case "medical_emergency":
      return "Medical Emergency Abroad/En Route";
    case "trip_interruption":
      return "Trip Interruption / Curtailment";
    case "other":
    default:
      return "Trip Disruption";
  }
}
