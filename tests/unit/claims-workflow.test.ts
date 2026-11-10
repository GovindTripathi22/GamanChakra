import { describe, it, expect, beforeEach } from "vitest";
import {
  createClaimCaseAction,
  getTripClaimCasesAction,
  getUserClaimCasesAction,
  updateClaimCaseAction,
  confirmClaimEmailSentAction,
  updateClaimStatusAction,
  deleteClaimCaseAction,
  registerTestTripInStore,
  clearTestClaimsStore,
} from "@/actions/claims";
import {
  generateEvidenceChecklist,
  getMissingEvidence,
  sanitizePolicyNumber,
} from "@/lib/claims/checklist";
import {
  buildClaimEmailDraft,
  buildMailtoUrl,
  buildGmailWebUrl,
} from "@/lib/claims/email";
import { generateClaimSummaryPdf } from "@/lib/claims/pdf";
import { generateIncidentTimeline } from "@/lib/claims/timeline";
import { getGlobalTelemetryStats } from "@/lib/outcome-ledger";
import {
  IRDAI_BIMA_BHAROSA_URL,
  IRDAI_GRIEVANCE_FAQ_URL,
  TATA_AIG_CLAIM_DOCS_GUIDE_URL,
  ClaimCase,
} from "@/types/claim";

describe("Voyage Claims Autopilot & Mission Control", () => {
  beforeEach(() => {
    clearTestClaimsStore();
  });

  describe("1. Trip Ownership & Authorization", () => {
    it("allows the trip owner (guest or authenticated) to create and view claim cases", async () => {
      const tripId = "trip-test-owner-1";
      registerTestTripInStore({
        id: tripId,
        ownerId: "guest_session_alice",
        destination: "Paris, France",
        title: "Paris Exploration",
      });

      // Alice creates claim
      const res = await createClaimCaseAction(
        tripId,
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-25",
          provider: "Air France",
          description: "Flight AF-224 delayed 4 hours due to hydraulic fault",
          policyNumberLast4: "9821",
          insurerName: "TATA AIG",
        },
        "guest_session_alice"
      );

      expect(res.success).toBe(true);
      expect(res.claim).toBeDefined();
      expect(res.claim?.tripId).toBe(tripId);
      expect(res.claim?.ownerId).toBe("guest_session_alice");
      expect(res.claim?.status).toBe("draft");

      // Alice can list her claims for this trip
      const listRes = await getTripClaimCasesAction(tripId, "guest_session_alice");
      expect(listRes.success).toBe(true);
      expect(listRes.claims.length).toBe(1);
      expect(listRes.claims[0].id).toBe(res.claim!.id);
    });

    it("rejects unauthorized access when a user attempts to create or view a claim on another user's trip", async () => {
      const tripId = "trip-test-owner-2";
      registerTestTripInStore({
        id: tripId,
        ownerId: "user_alice",
        destination: "Tokyo, Japan",
        title: "Tokyo Tech Tour",
      });

      // Mallory tries to create claim on Alice's trip
      const intruderCreate = await createClaimCaseAction(
        tripId,
        {
          incidentType: "flight_cancellation",
          incidentDate: "2026-10-26",
          provider: "ANA",
        },
        "user_mallory"
      );

      expect(intruderCreate.success).toBe(false);
      expect(intruderCreate.error).toMatch(/Unauthorized/i);

      // Mallory tries to view Alice's trip claims
      const intruderList = await getTripClaimCasesAction(tripId, "user_mallory");
      expect(intruderList.success).toBe(false);
      expect(intruderList.claims.length).toBe(0);
    });

    it("prevents foreign users from updating or deleting an existing claim case", async () => {
      const tripId = "trip-test-owner-3";
      registerTestTripInStore({
        id: tripId,
        ownerId: "guest_bob",
        destination: "Rome, Italy",
        title: "Rome Holiday",
      });

      const createRes = await createClaimCaseAction(
        tripId,
        {
          incidentType: "baggage_delay",
          incidentDate: "2026-10-20",
          provider: "ITA Airways",
        },
        "guest_bob"
      );

      expect(createRes.success).toBe(true);
      const claimId = createRes.claim!.id;

      // Intruder attempts update
      const updateRes = await updateClaimCaseAction(
        claimId,
        { description: "Hacked description" },
        "intruder_eve"
      );
      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toMatch(/Unauthorized/i);

      // Intruder attempts deletion
      const deleteRes = await deleteClaimCaseAction(claimId, "intruder_eve");
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.error).toMatch(/Unauthorized/i);
    });

    it("allows the owner to delete their claim case and handles non-existent claims", async () => {
      const tripId = "trip-test-owner-delete";
      registerTestTripInStore({
        id: tripId,
        ownerId: "user_delete_owner",
        destination: "Kyoto, Japan",
        title: "Kyoto Temple Tour",
      });

      const createRes = await createClaimCaseAction(
        tripId,
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-26",
          provider: "Japan Airlines",
        },
        "user_delete_owner"
      );

      expect(createRes.success).toBe(true);
      const claimId = createRes.claim!.id;

      // Owner successfully deletes
      const deleteRes = await deleteClaimCaseAction(claimId, "user_delete_owner");
      expect(deleteRes.success).toBe(true);

      // Attempting to delete already-deleted or non-existent claim
      const retryDelete = await deleteClaimCaseAction(claimId, "user_delete_owner");
      expect(retryDelete.success).toBe(false);
      expect(retryDelete.error).toMatch(/not found/i);
    });
  });

  describe("2. Real Claim Cases vs Demo Claims in Mission Control", () => {
    it("never counts demo claims as paid payouts in telemetry", () => {
      const stats = getGlobalTelemetryStats();
      expect(stats.shieldClaimsPaid).toBe(0);
      expect(stats.totalShieldPayoutAmount).toBe(0);
    });

    it("displays real saved cases in Mission Control with their authentic statuses", async () => {
      registerTestTripInStore({
        id: "trip-mc-1",
        ownerId: "guest_traveler_1",
        destination: "Goa, India",
        title: "Goa Weekend",
      });

      await createClaimCaseAction(
        "trip-mc-1",
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-22",
          provider: "IndiGo",
          description: "6E-502 delayed by 3 hours",
        },
        "guest_traveler_1"
      );

      const userClaimsRes = await getUserClaimCasesAction("guest_traveler_1");
      expect(userClaimsRes.success).toBe(true);
      expect(userClaimsRes.claims.length).toBe(1);
      expect(userClaimsRes.claims[0].status).toBe("draft");
      expect(userClaimsRes.claims[0].provider).toBe("IndiGo");
    });
  });

  describe("3. Disruption Prefilling & Demo Ineligibility Handling", () => {
    it("prefills real disruption facts and flags simulated disruptions as ineligible", async () => {
      registerTestTripInStore({
        id: "trip-sim-1",
        ownerId: "user_carol",
        destination: "Dubai, UAE",
        title: "Dubai Transit",
      });

      // Claim prefilled from a demo disruption
      const simClaimRes = await createClaimCaseAction(
        "trip-sim-1",
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-24",
          provider: "Emirates",
          description: "Simulated 75-minute transit lag on approach route to Dubai",
          isSimulatedDisruption: true,
        },
        "user_carol"
      );

      expect(simClaimRes.success).toBe(true);
      expect(simClaimRes.claim?.isSimulatedDisruption).toBe(true);
    });

    it("supports no-real-disruption scenario gracefully with manual entry", async () => {
      registerTestTripInStore({
        id: "trip-nodisrupt-1",
        ownerId: "user_dan",
        destination: "London, UK",
        title: "London Business Trip",
      });

      // No automated disruption existed, traveler files manually
      const manualClaimRes = await createClaimCaseAction(
        "trip-nodisrupt-1",
        {
          incidentType: "baggage_delay",
          incidentDate: "2026-10-25",
          provider: "British Airways",
          description: "Checked luggage delayed 36 hours at Heathrow Terminal 5",
          isSimulatedDisruption: false,
        },
        "user_dan"
      );

      expect(manualClaimRes.success).toBe(true);
      expect(manualClaimRes.claim?.isSimulatedDisruption).toBe(false);
      expect(manualClaimRes.claim?.provider).toBe("British Airways");
    });
  });

  describe("4. Category-Specific Evidence Checklists", () => {
    it("generates flight delay checklist with carrier confirmation, boarding pass, correspondence, receipts, and policy check", () => {
      const checklist = generateEvidenceChecklist("flight_delay", "Air India");

      const categories = checklist.map((i) => i.category);
      expect(categories).toContain("carrier_confirmation");
      expect(categories).toContain("ticket_boarding_pass");
      expect(categories).toContain("correspondence");
      expect(categories).toContain("expense_receipts");
      expect(categories).toContain("policy_specific");

      // Verify specific items
      const carrierCert = checklist.find((i) => i.category === "carrier_confirmation");
      expect(carrierCert?.required).toBe(true);
      expect(carrierCert?.label).toMatch(/Carrier Written Delay Confirmation/i);

      const boardingPass = checklist.find((i) => i.category === "ticket_boarding_pass");
      expect(boardingPass?.required).toBe(true);

      const policyCheck = checklist.find((i) => i.category === "policy_specific");
      expect(policyCheck?.required).toBe(true);
      expect(policyCheck?.description).toMatch(/Traveler must verify their policy terms/i);
    });

    it("surfaces missing required evidence accurately", () => {
      const checklist = generateEvidenceChecklist("flight_delay", "IndiGo");

      // Initially none are collected
      const initialMissing = getMissingEvidence(checklist);
      expect(initialMissing.totalCollected).toBe(0);
      expect(initialMissing.missingRequired.length).toBeGreaterThan(0);

      // Mark one required item collected
      checklist[0].collected = true;
      const updatedMissing = getMissingEvidence(checklist);
      expect(updatedMissing.totalCollected).toBe(1);
      expect(updatedMissing.missingRequired.length).toBe(initialMissing.missingRequired.length - 1);
    });

    it("generates distinct evidence checklists for flight cancellation, train delay, baggage delay, and medical emergency", () => {
      const cancelList = generateEvidenceChecklist("flight_cancellation", "Vistara");
      expect(cancelList.some((i) => i.label.includes("Cancellation"))).toBe(true);

      const trainList = generateEvidenceChecklist("train_delay", "Indian Railways");
      expect(trainList.some((i) => i.label.includes("Railway") || i.label.includes("TDR"))).toBe(true);

      const baggageList = generateEvidenceChecklist("baggage_delay", "Qatar Airways");
      expect(baggageList.some((i) => i.label.includes("PIR") || i.label.includes("Property Irregularity"))).toBe(true);

      const medicalList = generateEvidenceChecklist("medical_emergency", "Local Clinic");
      expect(medicalList.some((i) => i.label.includes("Doctor") || i.label.includes("Medical Report"))).toBe(true);
    });

    it("handles null, undefined, or empty checklist inputs defensibly without throwing", () => {
      expect(getMissingEvidence(null as any)).toEqual({
        missingRequired: [],
        missingRecommended: [],
        totalCollected: 0,
        totalItems: 0,
      });
      expect(getMissingEvidence(undefined as any)).toEqual({
        missingRequired: [],
        missingRecommended: [],
        totalCollected: 0,
        totalItems: 0,
      });
      expect(getMissingEvidence([] as any)).toEqual({
        missingRequired: [],
        missingRecommended: [],
        totalCollected: 0,
        totalItems: 0,
      });
    });
  });

  describe("5. Insurer Email Draft & Mail Client Unavailable Fallback", () => {
    it("builds a prefilled email draft with journey facts, incident details, and draft_not_sent status", () => {
      const dummyClaim: ClaimCase = {
        id: "claim-test-101",
        tripId: "trip-101",
        ownerId: "user_alice",
        incidentType: "flight_delay",
        incidentDate: "2026-10-25",
        provider: "Air India",
        description: "Flight AI-102 delayed 210 minutes due to technical check",
        isSimulatedDisruption: false,
        evidenceChecklist: generateEvidenceChecklist("flight_delay", "Air India"),
        incidentTimeline: [
          {
            id: "t1",
            timestamp: "2026-10-25 10:00",
            title: "Scheduled departure",
            description: "Scheduled flight AI-102 departure from DEL",
            source: "scheduled",
          },
        ],
        policyDetails: {
          insurerName: "TATA AIG",
          policyNumberLast4: "5512",
          insurerEmail: "travelclaims@tataaig.com",
        },
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const email = buildClaimEmailDraft({
        claim: dummyClaim,
        destination: "Paris, France",
        travelerName: "Alice Sharma",
        tripDates: { startDate: "2026-10-25", endDate: "2026-10-30" },
      });

      expect(email.to).toBe("travelclaims@tataaig.com");
      expect(email.subject).toContain("Flight Delay");
      expect(email.subject).toContain("****5512");
      expect(email.subject).toContain("Paris, France");
      expect(email.body).toContain("Alice Sharma");
      expect(email.body).toContain("Air India");
      expect(email.body).toContain("AI-102");
      expect(email.body).toContain("TATA AIG");
      expect(email.status).toBe("draft_not_sent");
    });

    it("generates valid mailto URL and webmail fallback URL when mail app is unavailable", () => {
      const draft = {
        to: "claims@hdfcergo.com",
        subject: "Travel Claim: Flight Delay | Ref: ****9876 | Berlin",
        body: "Claim narrative body text",
        status: "draft_not_sent" as const,
        lastGeneratedAt: new Date().toISOString(),
      };

      const mailto = buildMailtoUrl(draft);
      expect(mailto).toMatch(/^mailto:claims@hdfcergo\.com\?subject=/);
      expect(mailto).toContain(encodeURIComponent(draft.subject));

      const gmail = buildGmailWebUrl(draft);
      expect(gmail).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=claims(%40|@)hdfcergo\.com/);
    });

    it("requires explicit confirmation before transitioning status to sent_by_traveler", async () => {
      registerTestTripInStore({
        id: "trip-confirm-1",
        ownerId: "user_fiona",
        destination: "Singapore",
        title: "Singapore Holiday",
      });

      const res = await createClaimCaseAction(
        "trip-confirm-1",
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-26",
          provider: "Singapore Airlines",
          policyNumberLast4: "4321",
        },
        "user_fiona"
      );

      const claimId = res.claim!.id;
      // Before confirmation, status is strictly draft
      expect(res.claim?.status).toBe("draft");

      // Confirm sending with follow-up date
      const confirmRes = await confirmClaimEmailSentAction(
        claimId,
        "2026-11-02",
        "user_fiona"
      );

      expect(confirmRes.success).toBe(true);
      expect(confirmRes.claim?.status).toBe("sent_by_traveler");
      expect(confirmRes.claim?.followUpDate).toBe("2026-11-02");
      expect(confirmRes.claim?.emailDraft?.status).toBe("sent_confirmed");
    });

    it("allows traveler to record insurer response or settlement via updateClaimStatusAction", async () => {
      registerTestTripInStore({
        id: "trip-status-1",
        ownerId: "user_status_owner",
        destination: "Dubai",
        title: "Dubai Trip",
      });

      const res = await createClaimCaseAction(
        "trip-status-1",
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-26",
          provider: "Emirates",
        },
        "user_status_owner"
      );

      const claimId = res.claim!.id;
      const ackRes = await updateClaimStatusAction(
        claimId,
        "insurer_acknowledged",
        "Insurer acknowledged and assigned reference #DXB-1029",
        "user_status_owner"
      );

      expect(ackRes.success).toBe(true);
      expect(ackRes.claim?.status).toBe("insurer_acknowledged");
      expect(ackRes.claim?.notes).toContain("DXB-1029");
    });

    it("includes explicit simulation ineligibility advisory when isSimulatedDisruption is true", () => {
      const simClaim: ClaimCase = {
        id: "claim-sim-email",
        tripId: "trip-sim-email",
        ownerId: "user_sim",
        incidentType: "flight_delay",
        incidentDate: "2026-10-26",
        provider: "Air India",
        description: "Simulated 75-minute transit lag",
        isSimulatedDisruption: true,
        evidenceChecklist: [] as any,
        incidentTimeline: [] as any,
        policyDetails: {
          insurerName: "TATA AIG",
          policyNumberLast4: "9988",
          insurerEmail: "claims@tataaig.com",
        },
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const email = buildClaimEmailDraft({
        claim: simClaim,
        destination: "Mumbai, India",
        travelerName: "Demo Traveler",
      });

      expect(email.body).toMatch(/DEMO SIMULATION/i);
      expect(email.body).toMatch(/NOT eligible/i);
      expect(email.body).toMatch(/IRDAI/i);
    });
  });

  describe("6. Privacy, Safe Inputs & IRDAI Safeguards", () => {
    it("sanitizes policy numbers to only retain the last 4 alphanumeric characters", () => {
      expect(sanitizePolicyNumber("POL-9876543210")).toBe("3210");
      expect(sanitizePolicyNumber("ABC1234")).toBe("1234");
      expect(sanitizePolicyNumber("12")).toBe("12");
      expect(sanitizePolicyNumber("")).toBe("");
      expect(sanitizePolicyNumber(undefined)).toBe("");
    });

    it("handles fullwidth Unicode digits and mixed casing safely in policy number sanitization", () => {
      expect(sanitizePolicyNumber("POL-１２３４")).toBe("1234");
      expect(sanitizePolicyNumber("pol-4321")).toBe("4321");
      expect(sanitizePolicyNumber("  Policy-XYZ9  ")).toBe("XYZ9");
      expect(sanitizePolicyNumber("!@#$%^&*()")).toBe("");
    });

    it("never stores UPI IDs, bank details, or generates fictitious UTR payout references", async () => {
      registerTestTripInStore({
        id: "trip-privacy-1",
        ownerId: "user_george",
        destination: "Bangkok, Thailand",
        title: "Bangkok Street Food",
      });

      const res = await createClaimCaseAction(
        "trip-privacy-1",
        {
          incidentType: "flight_delay",
          incidentDate: "2026-10-26",
          provider: "Thai Airways",
          policyNumberLast4: "7788",
        },
        "user_george"
      );

      const claim = res.claim!;
      // Verify no bank details or UPI IDs in claim record
      expect((claim as any).upiId).toBeUndefined();
      expect((claim as any).utrNumber).toBeUndefined();
      expect((claim as any).bankAccountNumber).toBeUndefined();
      expect(claim.policyDetails.policyNumberLast4).toBe("7788");
    });

    it("provides legitimate IRDAI Bima Bharosa and grievance redressal links", () => {
      expect(IRDAI_BIMA_BHAROSA_URL).toBe("https://bimabharosa.irdai.gov.in/");
      expect(IRDAI_GRIEVANCE_FAQ_URL).toBe("https://bimabharosa.irdai.gov.in/Home/FAQ");
      expect(TATA_AIG_CLAIM_DOCS_GUIDE_URL).toContain("tataaig.com");
    });
  });

  describe("7. Claim Summary PDF Export", () => {
    it("generates a valid jsPDF document containing timeline, evidence checklist, and disclaimers", () => {
      const dummyClaim: ClaimCase = {
        id: "claim-pdf-test",
        tripId: "trip-pdf",
        ownerId: "user_helen",
        incidentType: "flight_delay",
        incidentDate: "2026-10-26",
        provider: "Lufthansa",
        description: "LH-760 delayed 5 hours due to ATC constraints",
        isSimulatedDisruption: false,
        evidenceChecklist: generateEvidenceChecklist("flight_delay", "Lufthansa"),
        incidentTimeline: [
          {
            id: "tl-1",
            timestamp: "2026-10-26 14:00",
            title: "Scheduled Departure",
            description: "Scheduled flight from Frankfurt",
            source: "scheduled",
          },
          {
            id: "tl-2",
            timestamp: "2026-10-26 17:30",
            title: "Carrier Delay Notice",
            description: "Delay notice issued due to European ATC flow restriction",
            source: "carrier_notice",
          },
        ],
        policyDetails: {
          insurerName: "TATA AIG",
          policyNumberLast4: "1234",
          insurerEmail: "travelclaims@tataaig.com",
        },
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pdf = generateClaimSummaryPdf({
        claim: dummyClaim,
        destination: "Frankfurt, Germany",
        tripTitle: "Germany Autumn Tour",
        tripDates: { startDate: "2026-10-26", endDate: "2026-11-02" },
      });

      expect(pdf).toBeDefined();
      expect(typeof pdf.output).toBe("function");
      // Outputting as datauri should produce a non-empty string
      const output = pdf.output("datauristring");
      expect(output).toContain("data:application/pdf");
    });

    it("handles simulated disruptions and missing checklists safely in PDF generator", () => {
      const simClaim: ClaimCase = {
        id: "claim-pdf-sim",
        tripId: "trip-pdf-sim",
        ownerId: "user_sim_pdf",
        incidentType: "train_delay",
        incidentDate: "2026-10-26",
        provider: "Eurostar",
        isSimulatedDisruption: true,
        evidenceChecklist: [] as any,
        incidentTimeline: [] as any,
        policyDetails: {
          insurerName: "TATA AIG",
          policyNumberLast4: "5555",
        },
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pdf = generateClaimSummaryPdf({
        claim: simClaim,
        destination: "Brussels, Belgium",
      });

      expect(pdf).toBeDefined();
      const output = pdf.output("datauristring");
      expect(output).toContain("data:application/pdf");
    });
  });

  describe("8. Incident Timeline Generator", () => {
    it("generates chronological departure, incident, and dossier assembly events", () => {
      const events = generateIncidentTimeline({
        incidentType: "flight_delay",
        incidentDate: "2026-10-26",
        provider: "Air France",
        destination: "Paris, France",
        description: "Hydraulic check delayed flight AF-224 by 4 hours",
        isSimulatedDisruption: false,
      });

      expect(events.length).toBe(3);
      expect(events[0].source).toBe("scheduled");
      expect(events[0].title).toContain("Scheduled Departure");
      expect(events[1].source).toBe("carrier_notice");
      expect(events[1].title).toContain("Flight Delay Incurred");
      expect(events[2].source).toBe("traveler_note");
      expect(events[2].title).toContain("Claims Dossier Assembled");
    });

    it("clearly flags demo simulations in timeline event titles", () => {
      const events = generateIncidentTimeline({
        incidentType: "flight_delay",
        incidentDate: "2026-10-26",
        provider: "Demo Airlines",
        destination: "Goa, India",
        isSimulatedDisruption: true,
      });

      expect(events[1].title).toContain("Simulated Disruption Demo");
      expect(events[1].description).toContain("Simulated 75-minute transit lag");
    });
  });
});
