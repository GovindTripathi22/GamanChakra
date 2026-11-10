"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Mail,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  PlusCircle,
  HelpCircle,
  Info,
  Trash2,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedTrip } from "@/types/trip";
import type {
  ClaimCase,
  ClaimIncidentType,
  EvidenceItem,
} from "@/types/claim";
import {
  generateEvidenceChecklist,
  getMissingEvidence,
  getIncidentTypeLabel,
  sanitizePolicyNumber,
} from "@/lib/claims/checklist";
import {
  buildClaimEmailDraft,
  buildMailtoUrl,
  buildGmailWebUrl,
  getDefaultInsurerEmail,
} from "@/lib/claims/email";
import { generateClaimSummaryPdf } from "@/lib/claims/pdf";
import { generateIncidentTimeline } from "@/lib/claims/timeline";
import { getOrCreateGuestSessionId } from "@/lib/claims/session";
import {
  createClaimCaseAction,
  getTripClaimCasesAction,
  updateClaimCaseAction,
  confirmClaimEmailSentAction,
  deleteClaimCaseAction,
} from "@/actions/claims";
import {
  IRDAI_BIMA_BHAROSA_URL,
  IRDAI_GRIEVANCE_FAQ_URL,
  TATA_AIG_CLAIM_DOCS_GUIDE_URL,
} from "@/types/claim";

interface TripShieldCardProps {
  tripId: string;
  destination: string;
  trip?: GeneratedTrip;
  guestSessionId?: string;
}

export function TripShieldCard({
  tripId,
  destination,
  trip,
  guestSessionId,
}: TripShieldCardProps) {
  const [activeGuestId, setActiveGuestId] = useState<string>(guestSessionId || "");
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [casesModalOpen, setCasesModalOpen] = useState(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);

  const [existingCases, setExistingCases] = useState<ClaimCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ClaimCase | null>(null);
  const [editingCase, setEditingCase] = useState<ClaimCase | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<EvidenceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Initialize and persist guest session ID
  useEffect(() => {
    const gid = guestSessionId || getOrCreateGuestSessionId();
    setActiveGuestId(gid);
  }, [guestSessionId]);

  // Form State
  const [incidentType, setIncidentType] = useState<ClaimIncidentType>("flight_delay");
  const [incidentDate, setIncidentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [provider, setProvider] = useState<string>("Air India");
  const [description, setDescription] = useState<string>("");
  const [insurerName, setInsurerName] = useState<string>("TATA AIG");
  const [policyLast4, setPolicyLast4] = useState<string>("");
  const [insurerEmail, setInsurerEmail] = useState<string>("travelclaims@tataaig.com");
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isSimulatedDisruption, setIsSimulatedDisruption] = useState<boolean>(false);
  const [disruptionNote, setDisruptionNote] = useState<string | null>(null);

  // Email draft state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [followUpDate, setFollowUpDate] = useState<string>(
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  );

  // Load existing claims for this trip
  useEffect(() => {
    const loadTripClaims = async () => {
      try {
        const gid = guestSessionId || activeGuestId || getOrCreateGuestSessionId();
        const res = await getTripClaimCasesAction(tripId, gid);
        if (res.success && res.claims) {
          setExistingCases(res.claims);
        }
      } catch (err) {
        console.error("Failed to load trip claims:", err);
      }
    };
    loadTripClaims();
  }, [tripId, guestSessionId, activeGuestId]);

  // Update default checklist when incident type or provider changes
  useEffect(() => {
    if (!selectedCase) {
      setEvidenceList(generateEvidenceChecklist(incidentType, provider));
    }
  }, [incidentType, provider, selectedCase]);

  // Update default insurer email when insurer changes
  useEffect(() => {
    if (!selectedCase) {
      setInsurerEmail(getDefaultInsurerEmail(insurerName));
    }
  }, [insurerName, selectedCase]);

  // Inspect trip for real or simulated disruptions to prefill the claim
  const prefillFromTrip = (forceDemoSimulation: boolean = false) => {
    setSelectedCase(null);
    setSaveSuccess(false);

    let detectedIncident: ClaimIncidentType = "flight_delay";
    let detectedProvider = trip?.transportation_plan?.[0]?.available_options?.[0]?.provider || "Air India";
    const detectedDate = trip?.trip_details?.startDate || new Date().toISOString().slice(0, 10);
    let detectedDesc = "";
    let isSimulated = false;
    let note: string | null = null;

    let foundDisruption = false;
    if (!forceDemoSimulation && trip?.itinerary) {
      for (const day of trip.itinerary) {
        for (const act of day.activities) {
          if (
            act.status === "delayed" ||
            act.status === "cancelled" ||
            act.status === "disrupted" ||
            (act.actualOutcome && act.actualOutcome.actualDelayMinutes > 0)
          ) {
            foundDisruption = true;
            const delayMin = act.actualOutcome?.actualDelayMinutes || 60;
            detectedProvider = act.title.split("-")[0].trim() || act.title;
            const cat = (act.category || "").toLowerCase();
            const titleLower = act.title.toLowerCase();
            if (act.status === "cancelled") {
              detectedIncident = "flight_cancellation";
            } else if (titleLower.includes("train") || titleLower.includes("rail") || cat.includes("train") || cat.includes("rail")) {
              detectedIncident = "train_delay";
            } else if (titleLower.includes("baggage") || titleLower.includes("luggage")) {
              detectedIncident = "baggage_delay";
            } else {
              detectedIncident = "flight_delay";
            }
            detectedDesc = `${act.title} was delayed by ${delayMin} minutes. Impacted itinerary schedule for Day ${day.day}.`;
            break;
          }
        }
        if (foundDisruption) break;
      }
    }

    if (forceDemoSimulation) {
      isSimulated = true;
      note = "Interactive Demo Notice: Telemetry transit lag was simulated. Simulated disruptions are NOT eligible as claim evidence with insurers. For actual insurance claims, official carrier confirmation is mandatory.";
      detectedDesc = `Simulated 75-minute transit lag on approach route to ${destination}.`;
    } else if (!foundDisruption) {
      note = "No automated disruption detected on this trip. You can manually enter your disruption details below.";
      detectedDesc = "";
    }

    setIncidentType(detectedIncident);
    setProvider(detectedProvider);
    setIncidentDate(detectedDate);
    setDescription(detectedDesc);
    setIsSimulatedDisruption(isSimulated);
    setDisruptionNote(note);
    setPolicyLast4("");
    setEvidenceList(generateEvidenceChecklist(detectedIncident, detectedProvider));
    setClaimModalOpen(true);
  };

  const handleToggleEvidence = (itemId: string) => {
    setEvidenceList((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, collected: !item.collected } : item
      )
    );
  };

  const handleSaveClaim = async () => {
    setIsSaving(true);
    try {
      const sanitizedLast4 = sanitizePolicyNumber(policyLast4);
      const gid = activeGuestId || getOrCreateGuestSessionId();
      const timeline = generateIncidentTimeline({
        incidentType,
        incidentDate,
        provider,
        description,
        destination,
        trip,
        isSimulatedDisruption,
      });

      const res = await createClaimCaseAction(
        tripId,
        {
          incidentType,
          incidentDate,
          provider,
          description,
          isSimulatedDisruption,
          insurerName,
          policyNumberLast4: sanitizedLast4,
          insurerEmail,
          followUpDate,
          evidenceChecklist: evidenceList,
          incidentTimeline: timeline,
        },
        gid
      );

      if (res.success && res.claim) {
        setSelectedCase(res.claim);
        setExistingCases((prev) => [res.claim!, ...prev.filter((c) => c.id !== res.claim!.id)]);
        setSaveSuccess(true);
      } else {
        alert(res.error || "Failed to save claim case.");
      }
    } catch (e: any) {
      console.error("Save claim error:", e);
      alert("Error saving claim case: " + (e.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCase = async (claimId: string) => {
    if (!confirm("Are you sure you want to delete this claim case?")) return;
    try {
      const gid = activeGuestId || getOrCreateGuestSessionId();
      const res = await deleteClaimCaseAction(claimId, gid);
      if (res.success) {
        setExistingCases((prev) => prev.filter((c) => c.id !== claimId));
      } else {
        alert(res.error || "Failed to delete claim case.");
      }
    } catch (e: any) {
      alert("Error deleting claim case: " + e.message);
    }
  };

  const handleOpenChecklistModal = (c: ClaimCase) => {
    setEditingCase(c);
    setEditingEvidence(c.evidenceChecklist || []);
    setChecklistModalOpen(true);
  };

  const handleSaveChecklistProgress = async () => {
    if (!editingCase) return;
    try {
      const gid = activeGuestId || getOrCreateGuestSessionId();
      const res = await updateClaimCaseAction(
        editingCase.id,
        { evidenceChecklist: editingEvidence },
        gid
      );
      if (res.success && res.claim) {
        setExistingCases((prev) =>
          prev.map((c) => (c.id === res.claim!.id ? res.claim! : c))
        );
        setChecklistModalOpen(false);
      } else {
        alert(res.error || "Failed to update evidence checklist.");
      }
    } catch (e: any) {
      alert("Error updating checklist: " + e.message);
    }
  };

  const handleOpenEmailReview = (c: ClaimCase) => {
    const draft =
      c.emailDraft ||
      buildClaimEmailDraft({
        claim: c,
        destination,
        tripDates: {
          startDate: trip?.trip_details?.startDate,
          endDate: trip?.trip_details?.endDate,
        },
      });

    setEmailTo(draft.to);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
    setFollowUpDate(c.followUpDate || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    setSelectedCase(c);
    setEmailModalOpen(true);
  };

  const handleConfirmSent = async () => {
    if (!selectedCase) return;
    try {
      const gid = activeGuestId || getOrCreateGuestSessionId();
      const res = await confirmClaimEmailSentAction(selectedCase.id, followUpDate, gid);
      if (res.success && res.claim) {
        setSelectedCase(res.claim);
        setExistingCases((prev) =>
          prev.map((c) => (c.id === res.claim!.id ? res.claim! : c))
        );
        alert(
          "Confirmed! Claim status updated to 'Email Sent by Traveler'. A follow-up reminder has been recorded in Mission Control."
        );
        setEmailModalOpen(false);
      } else {
        alert(res.error || "Failed to confirm email sent.");
      }
    } catch (e: any) {
      alert("Error confirming email sent: " + e.message);
    }
  };

  const handleDownloadPdf = (c: ClaimCase) => {
    try {
      const doc = generateClaimSummaryPdf({
        claim: c,
        destination,
        tripTitle: trip?.trip_details?.destination || destination,
        tripDates: {
          startDate: trip?.trip_details?.startDate,
          endDate: trip?.trip_details?.endDate,
        },
      });
      doc.save(`Voyage-Claim-Case-${c.id}.pdf`);
    } catch (e: any) {
      console.error("PDF export error:", e);
      alert("Failed to export PDF: " + e.message);
    }
  };

  const { missingRequired, totalCollected, totalItems } = getMissingEvidence(evidenceList);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-orange-50/20 p-5 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-800/40 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Voyage Shield™ — Claims Autopilot
              </h4>
              <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] font-semibold">
                Self-Review & Assist
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
              Experienced a flight, train, or baggage disruption? Voyage gathers incident facts, tracks missing carrier evidence, generates a claim dossier, and drafts an insurer email for your review.
            </p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                IRDAI Notice: No payout fees or disbursement QR codes
              </span>
              <a
                href={IRDAI_BIMA_BHAROSA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-orange-500 inline-flex items-center gap-0.5"
              >
                IRDAI Bima Bharosa
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {existingCases.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-semibold"
              onClick={() => setCasesModalOpen(true)}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Saved Cases ({existingCases.length})
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="text-xs text-slate-600 dark:text-slate-300 font-medium"
            onClick={() => prefillFromTrip(true)}
          >
            Demo Simulation
          </Button>

          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-orange-500/20"
            onClick={() => prefillFromTrip(false)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Start a claim
          </Button>
        </div>
      </div>

      {/* Start a Claim Dialog */}
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Voyage Claims Autopilot — Case Dossier
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Build a persistent, insurer-ready claim case from real journey facts.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {saveSuccess && selectedCase ? (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-bold text-sm">Claim Case Saved (Draft — Not Sent)</h5>
                  <p className="text-xs leading-relaxed">
                    Case reference <strong>{selectedCase.id}</strong> has been saved to your Mission Control. Voyage has not contacted the insurer or filed externally.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  onClick={() => {
                    setClaimModalOpen(false);
                    handleOpenEmailReview(selectedCase);
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Review Insurer Email Draft
                </Button>

                <Button
                  variant="outline"
                  className="font-semibold text-xs flex items-center justify-center gap-1.5"
                  onClick={() => handleDownloadPdf(selectedCase)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Summary PDF
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-slate-500"
                onClick={() => setClaimModalOpen(false)}
              >
                Close & Return to Journey
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Disruption or Simulation Banner */}
              {isSimulatedDisruption && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong className="font-semibold">Interactive Demo Notice: </strong>
                    Simulated disruptions are marked as demos and are <strong>ineligible as claim evidence</strong> with insurers. Real insurance claims require official carrier confirmation.
                  </div>
                </div>
              )}

              {disruptionNote && !isSimulatedDisruption && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                  <span>{disruptionNote}</span>
                </div>
              )}

              {/* Incident Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="incident-type" className="text-xs font-semibold">
                    Incident Type
                  </Label>
                  <select
                    id="incident-type"
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as ClaimIncidentType)}
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="flight_delay">Flight Delay</option>
                    <option value="flight_cancellation">Flight Cancellation</option>
                    <option value="train_delay">Train Delay / Cancellation</option>
                    <option value="baggage_delay">Baggage Delay / Loss</option>
                    <option value="medical_emergency">Medical Emergency</option>
                    <option value="trip_interruption">Trip Interruption</option>
                    <option value="other">Other Disruption</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="incident-date" className="text-xs font-semibold">
                    Incident Date
                  </Label>
                  <Input
                    id="incident-date"
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="incident-provider" className="text-xs font-semibold">
                    Transport / Service Provider
                  </Label>
                  <Input
                    id="incident-provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. Air India, IndiGo, Deutsche Bahn"
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="insurer-name" className="text-xs font-semibold">
                    Insurance Provider
                  </Label>
                  <select
                    id="insurer-name"
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="TATA AIG">TATA AIG General Insurance</option>
                    <option value="HDFC ERGO">HDFC ERGO Travel Insurance</option>
                    <option value="ICICI Lombard">ICICI Lombard</option>
                    <option value="Bajaj Allianz">Bajaj Allianz</option>
                    <option value="Care Health">Care Health Insurance</option>
                    <option value="Other">Other Travel Insurer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="policy-last4" className="text-xs font-semibold">
                      Policy Reference (Last 4 digits only)
                    </Label>
                    <span className="text-[10px] text-slate-400">Privacy Safe</span>
                  </div>
                  <Input
                    id="policy-last4"
                    maxLength={4}
                    value={policyLast4}
                    onChange={(e) => setPolicyLast4(sanitizePolicyNumber(e.target.value))}
                    placeholder="e.g. 4821"
                    className="text-xs h-8 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Do not enter full policy, card, or bank details.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="insurer-email" className="text-xs font-semibold">
                    Insurer Claims Email
                  </Label>
                  <Input
                    id="insurer-email"
                    type="email"
                    value={insurerEmail}
                    onChange={(e) => setInsurerEmail(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="incident-desc" className="text-xs font-semibold">
                  Incident Narrative & Impact
                </Label>
                <Textarea
                  id="incident-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what occurred, delay length, and impact on your trip..."
                  className="text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="claim-follow-up" className="text-xs font-semibold">
                    Target Follow-up Date (Optional)
                  </Label>
                  <Input
                    id="claim-follow-up"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={isSimulatedDisruption}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsSimulatedDisruption(val);
                        if (val && !description) {
                          setDescription(`Simulated 75-minute transit lag on approach route to ${destination}.`);
                        }
                      }}
                      className="rounded accent-orange-500"
                    />
                    <span className="font-medium">Mark as simulated demo disruption</span>
                  </label>
                </div>
              </div>

              {/* Missing Evidence Warning Callout */}
              {missingRequired.length > 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-500/30 p-3 text-xs text-red-800 dark:text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>Evidence Gap: {missingRequired.length} required item(s) uncollected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Insurers commonly reject or delay travel claims without official carrier confirmation. Check items below as you obtain them.
                  </p>
                </div>
              )}

              {/* Category-Specific Evidence Checklist */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Evidence Checklist ({totalCollected}/{totalItems} collected)
                  </h5>
                  <a
                    href={TATA_AIG_CLAIM_DOCS_GUIDE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-orange-600 dark:text-orange-400 underline flex items-center gap-0.5"
                  >
                    Document Guide
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {evidenceList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleEvidence(item.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                        item.collected
                          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/40"
                          : item.required
                          ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                          : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.collected}
                        onChange={() => {}}
                        className="mt-0.5 rounded accent-orange-500 shrink-0 cursor-pointer"
                      />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold ${item.collected ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
                            {item.label}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase">
                            {item.required ? (
                              <span className="text-red-500 font-bold">Required</span>
                            ) : (
                              "Recommended"
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClaimModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
                  onClick={handleSaveClaim}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving Case..." : "Save Claim Case"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Prefilled Email Dialog */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-500" />
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Insurer Correspondence — Review Email Draft
                </DialogTitle>
              </div>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold uppercase">
                Draft — Not Sent
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Voyage has no configured email service and cannot send emails on your behalf. Review the text below, open in your email client or copy to clipboard, and confirm sending.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recipient (Insurer Claims Desk)</Label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="text-xs h-8 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Body</Label>
              <Textarea
                rows={9}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="text-xs font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Email Client & Webmail Launch Actions */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                1. Send from your email account:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const mailto = buildMailtoUrl({
                      to: emailTo,
                      subject: emailSubject,
                      body: emailBody,
                      status: "draft_not_sent",
                      lastGeneratedAt: new Date().toISOString(),
                    });
                    window.location.href = mailto;
                  }}
                >
                  <Mail className="h-3.5 w-3.5 mr-1 text-orange-500" />
                  Open in Mail App
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const gmail = buildGmailWebUrl({
                      to: emailTo,
                      subject: emailSubject,
                      body: emailBody,
                      status: "draft_not_sent",
                      lastGeneratedAt: new Date().toISOString(),
                    });
                    window.open(gmail, "_blank");
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1 text-red-500" />
                  Open in Gmail Web
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `To: ${emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`
                      );
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    } catch {
                      alert("Failed to copy automatically. Please select text manually.");
                    }
                  }}
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      Copy Email Text
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Follow-up Date and Confirmation */}
            <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-500/30 space-y-2">
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                2. Set follow-up date and confirm submission:
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">Follow-up due:</span>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="text-xs h-7 w-36"
                  />
                </div>

                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs ml-auto"
                  onClick={handleConfirmSent}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Confirm I Sent This Email
                </Button>
              </div>
              <p className="text-[10px] text-slate-500">
                Case status will remain draft until you confirm having sent the email.
              </p>
            </div>

            {/* IRDAI Bima Bharosa Escalation Advisory */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-start gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span>
                Under IRDAI regulations, registered insurers must acknowledge claims within 3-5 days and communicate decisions within 15 days of document completion. If unresolved, lodge an escalation at{" "}
                <a
                  href={IRDAI_GRIEVANCE_FAQ_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-orange-600 dark:text-orange-400"
                >
                  IRDAI Bima Bharosa
                </a>
                .
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Saved Cases Dialog */}
      <Dialog open={casesModalOpen} onOpenChange={setCasesModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Saved Claim Cases for this Trip ({existingCases.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Persistent claim dossiers tracked for this itinerary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {existingCases.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {getIncidentTypeLabel(c.incidentType)} ({c.provider})
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.isSimulatedDisruption && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-semibold">
                        Demo Disruption
                      </Badge>
                    )}
                    <Badge
                      className={`text-[10px] font-semibold ${
                        c.status === "sent_by_traveler"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          : c.status === "settled"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : c.status === "rejected"
                          ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {c.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="text-slate-500 flex items-center gap-3 text-[11px] flex-wrap">
                  <span>Date: {c.incidentDate}</span>
                  {c.policyDetails?.insurerName && (
                    <span>Insurer: {c.policyDetails.insurerName}</span>
                  )}
                  {c.policyDetails?.policyNumberLast4 && (
                    <span>Ref: ****{c.policyDetails.policyNumberLast4}</span>
                  )}
                  {c.followUpDate && <span>Follow-up: {c.followUpDate}</span>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-7"
                    onClick={() => {
                      setCasesModalOpen(false);
                      handleOpenChecklistModal(c);
                    }}
                  >
                    <ListChecks className="h-3 w-3 mr-1 text-orange-500" />
                    Checklist
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-7"
                    onClick={() => {
                      setCasesModalOpen(false);
                      handleOpenEmailReview(c);
                    }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Review Email Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-7"
                    onClick={() => handleDownloadPdf(c)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[11px] h-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-1"
                    onClick={() => handleDeleteCase(c.id)}
                    title="Delete Claim Case"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Checklist Progress Modal */}
      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-orange-500" />
              Evidence Checklist Progress
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Check off carrier documents and receipts as they are collected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {editingEvidence.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setEditingEvidence((prev) =>
                      prev.map((i) =>
                        i.id === item.id ? { ...i, collected: !i.collected } : i
                      )
                    );
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                    item.collected
                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/40"
                      : item.required
                      ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                      : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.collected}
                    onChange={() => {}}
                    className="mt-0.5 rounded accent-orange-500 shrink-0 cursor-pointer"
                  />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${item.collected ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase">
                        {item.required ? (
                          <span className="text-red-500 font-bold">Required</span>
                        ) : (
                          "Recommended"
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setChecklistModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
                onClick={handleSaveChecklistProgress}
              >
                Save Progress
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
