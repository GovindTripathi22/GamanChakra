"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    MapPin,
    Calendar,
    Wallet,
    Sparkles,
    Trash2,
    ArrowRight,
    Activity,
    ShieldCheck,
    ShieldAlert,
    FileText,
    Mail,
    Download,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    Copy,
    Check,
    Clock,
    HelpCircle,
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
import Link from "next/link";
import type { GeneratedTrip } from "@/types/trip";
import type { ClaimCase, ClaimCaseStatus, EvidenceItem } from "@/types/claim";
import { getGlobalTelemetryStats } from "@/lib/outcome-ledger";
import { getUserTripsFromDatabase, saveTripToDatabase, getTripFromDatabase } from "@/actions/trip-persistence";
import {
    getUserClaimCasesAction,
    confirmClaimEmailSentAction,
    updateClaimStatusAction,
    deleteClaimCaseAction,
    updateClaimCaseAction,
} from "@/actions/claims";
import { getMissingEvidence, getIncidentTypeLabel } from "@/lib/claims/checklist";
import { buildClaimEmailDraft, buildMailtoUrl, buildGmailWebUrl } from "@/lib/claims/email";
import { generateClaimSummaryPdf } from "@/lib/claims/pdf";
import { getOrCreateGuestSessionId } from "@/lib/claims/session";
import {
    IRDAI_BIMA_BHAROSA_URL,
    IRDAI_GRIEVANCE_FAQ_URL,
    TATA_AIG_CLAIM_DOCS_GUIDE_URL,
} from "@/types/claim";

interface SavedTrip extends GeneratedTrip {
    id: string;
    createdAt: number;
}

function getDefaultFollowUp(): string {
    const target = new Date();
    target.setDate(target.getDate() + 7);
    return target.toISOString().slice(0, 10);
}

export default function MyTripsPage() {
    const [trips, setTrips] = useState<SavedTrip[]>([]);
    const [claimCases, setClaimCases] = useState<ClaimCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [telemetry, setTelemetry] = useState({
        totalTrackedSteps: 142,
        predictionAccuracy: 92.4,
        averageDelayMinutes: 14.2,
        shieldClaimsPaid: 0,
        totalShieldPayoutAmount: 0,
    });

    // Guest Session State
    const [activeGuestId, setActiveGuestId] = useState<string>("");

    // Email Review Dialog State
    const [selectedEmailCase, setSelectedEmailCase] = useState<ClaimCase | null>(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [followUpDate, setFollowUpDate] = useState("");
    const [copiedEmail, setCopiedEmail] = useState(false);

    // Status Update Dialog State
    const [selectedStatusCase, setSelectedStatusCase] = useState<ClaimCase | null>(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<ClaimCaseStatus>("draft");
    const [statusNotes, setStatusNotes] = useState("");

    // Evidence Checklist Progress Dialog State
    const [checklistCase, setChecklistCase] = useState<ClaimCase | null>(null);
    const [checklistModalOpen, setChecklistModalOpen] = useState(false);
    const [editingEvidence, setEditingEvidence] = useState<EvidenceItem[]>([]);

    useEffect(() => {
        const guestId = getOrCreateGuestSessionId();
        setActiveGuestId(guestId);

        const loadTripsAndClaims = async () => {
            const loadedTrips: SavedTrip[] = [];
            const processedIds = new Set<string>();

            // 1. Fetch persistent trips from SQLite/Postgres DB
            try {
                const dbTrips = await getUserTripsFromDatabase();
                for (const dt of dbTrips) {
                    const fullTrip = await getTripFromDatabase(dt.id);
                    if (fullTrip) {
                        loadedTrips.push({
                            ...fullTrip,
                            id: `trip_${dt.id}`,
                            createdAt: new Date(dt.createdAt).getTime(),
                        });
                        processedIds.add(dt.id);
                        processedIds.add(`trip_${dt.id}`);
                    }
                }
            } catch (err) {
                console.error("Failed to load trips from DB:", err);
            }

            // 2. Read local storage trips safely and auto-migrate any unsaved local trips to the DB
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key?.startsWith("trip_") && !processedIds.has(key)) {
                            try {
                                const raw = localStorage.getItem(key);
                                if (!raw) continue;
                                const tripData = JSON.parse(raw);
                                const cleanId = key.replace("trip_", "");
                                if (!processedIds.has(cleanId)) {
                                    const timestamp = parseInt(cleanId, 10) || Date.now();
                                    loadedTrips.push({ ...tripData, id: key, createdAt: timestamp });
                                    // Silently sync to database
                                    saveTripToDatabase(tripData, cleanId).catch(() => {});
                                }
                            } catch (e) {
                                console.error("Failed to parse trip", key, e);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed accessing localStorage for saved trips:", err);
            }

            setTrips(loadedTrips.sort((a, b) => b.createdAt - a.createdAt));

            // 3. Fetch real saved claim cases (never old demo claims)
            try {
                const claimsRes = await getUserClaimCasesAction(guestId);
                if (claimsRes.success && claimsRes.claims) {
                    setClaimCases(claimsRes.claims);
                }
            } catch (err) {
                console.error("Failed to load claim cases:", err);
            }

            // 4. Ground-truth telemetry (strictly zero fake payouts)
            const stats = getGlobalTelemetryStats();
            setTelemetry({
                ...stats,
                shieldClaimsPaid: 0,
                totalShieldPayoutAmount: 0,
            });

            setLoading(false);
        };

        loadTripsAndClaims();
    }, []);

    const deleteTrip = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this trip?")) {
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    localStorage.removeItem(id);
                }
            } catch (err) {
                console.error("Failed to delete trip from localStorage:", err);
            }
            setTrips(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleDeleteClaimCase = async (e: React.MouseEvent, claimId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this claim case? This action cannot be undone.")) {
            try {
                const gid = activeGuestId || getOrCreateGuestSessionId();
                const res = await deleteClaimCaseAction(claimId, gid);
                if (res.success) {
                    setClaimCases(prev => prev.filter(c => c.id !== claimId));
                } else {
                    alert(res.error || "Failed to delete claim case.");
                }
            } catch (err: any) {
                alert("Error deleting claim case: " + err.message);
            }
        }
    };

    const handleOpenChecklistModal = (c: ClaimCase) => {
        setChecklistCase(c);
        setEditingEvidence(c.evidenceChecklist ? [...c.evidenceChecklist] : []);
        setChecklistModalOpen(true);
    };

    const handleSaveChecklistProgress = async () => {
        if (!checklistCase) return;
        try {
            const gid = activeGuestId || getOrCreateGuestSessionId();
            const res = await updateClaimCaseAction(
                checklistCase.id,
                { evidenceChecklist: editingEvidence },
                gid
            );
            if (res.success && res.claim) {
                setClaimCases(prev => prev.map(c => c.id === res.claim!.id ? res.claim! : c));
                setChecklistModalOpen(false);
            } else {
                alert(res.error || "Failed to update evidence checklist.");
            }
        } catch (e: any) {
            alert("Error updating checklist: " + e.message);
        }
    };

    const handleOpenEmailModal = (c: ClaimCase) => {
        const matchingTrip = trips.find(t => t.id === `trip_${c.tripId}` || t.id === c.tripId);
        const destination = matchingTrip?.trip_details?.destination || "Destination";
        const draft = c.emailDraft || buildClaimEmailDraft({
            claim: c,
            destination,
            tripDates: {
                startDate: matchingTrip?.trip_details?.startDate,
                endDate: matchingTrip?.trip_details?.endDate,
            },
        });

        setSelectedEmailCase(c);
        setEmailTo(draft.to);
        setEmailSubject(draft.subject);
        setEmailBody(draft.body);
        setFollowUpDate(c.followUpDate || getDefaultFollowUp());
        setEmailModalOpen(true);
    };

    const handleConfirmEmailSent = async () => {
        if (!selectedEmailCase) return;
        try {
            const gid = activeGuestId || getOrCreateGuestSessionId();
            const res = await confirmClaimEmailSentAction(selectedEmailCase.id, followUpDate, gid);
            if (res.success && res.claim) {
                setClaimCases(prev => prev.map(c => c.id === res.claim!.id ? res.claim! : c));
                setEmailModalOpen(false);
                alert("Claim status updated to 'Email Sent by Traveler'. A follow-up date has been scheduled.");
            } else {
                alert(res.error || "Failed to confirm email sent.");
            }
        } catch (e: any) {
            alert("Error confirming email: " + e.message);
        }
    };

    const handleDownloadPdf = (c: ClaimCase) => {
        const matchingTrip = trips.find(t => t.id === `trip_${c.tripId}` || t.id === c.tripId);
        const destination = matchingTrip?.trip_details?.destination || "Travel Destination";
        try {
            const doc = generateClaimSummaryPdf({
                claim: c,
                destination,
                tripTitle: matchingTrip?.trip_details?.destination,
                tripDates: {
                    startDate: matchingTrip?.trip_details?.startDate,
                    endDate: matchingTrip?.trip_details?.endDate,
                },
            });
            doc.save(`Voyage-Claim-${c.id}.pdf`);
        } catch (e: any) {
            alert("Error generating PDF: " + e.message);
        }
    };

    const handleOpenStatusModal = (c: ClaimCase) => {
        setSelectedStatusCase(c);
        setNewStatus(c.status);
        setStatusNotes(c.notes || "");
        setStatusModalOpen(true);
    };

    const handleSaveStatusUpdate = async () => {
        if (!selectedStatusCase) return;
        try {
            const gid = activeGuestId || getOrCreateGuestSessionId();
            const res = await updateClaimStatusAction(selectedStatusCase.id, newStatus, statusNotes, gid);
            if (res.success && res.claim) {
                setClaimCases(prev => prev.map(c => c.id === res.claim!.id ? res.claim! : c));
                setStatusModalOpen(false);
            } else {
                alert(res.error || "Failed to update claim status.");
            }
        } catch (e: any) {
            alert("Error updating status: " + e.message);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-pulse text-xl text-slate-400">Loading your live journeys...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 text-xs">
                                Voyage Execution Engine
                            </Badge>
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Telemetry Active
                            </Badge>
                        </div>
                        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">
                            Mission <span className="text-orange-500">Control</span>
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                            Monitor real-time journey health, track active claims dossiers, and manage itinerary execution.
                        </p>
                    </div>
                    <Link href="/create-trip">
                        <Button className="bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25">
                            + Plan New Trip
                        </Button>
                    </Link>
                </div>

                {/* Voyage Global Telemetry Banner */}
                <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-800/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-orange-500" />
                            Voyage Ground-Truth Outcome Ledger (Proprietary Dataset)
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Self-Improving World Model
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Tracked Live Steps</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {telemetry.totalTrackedSteps}
                            </p>
                            <p className="text-[10px] text-emerald-600 mt-0.5">Real-world telemetry</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Prediction Accuracy</p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {telemetry.predictionAccuracy}%
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Crowd & delay models</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Avg. Delay Absorption</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {telemetry.averageDelayMinutes}m
                            </p>
                            <p className="text-[10px] text-orange-500 mt-0.5">Auto-healed by agent</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Active Claim Cases</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {claimCases.length}
                            </p>
                            <p className="text-[10px] text-orange-500 mt-0.5">
                                {claimCases.filter(c => c.status === "sent_by_traveler").length} filed with insurer
                            </p>
                        </div>
                    </div>
                </div>

                {/* Claims Center Section */}
                <div className="mb-10 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-800/60 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-semibold">
                                    Claims Center
                                </Badge>
                                <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                                    Self-Review & Assist
                                </Badge>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                Travel Insurance Claims Center
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Build cases from journey disruptions, track missing carrier evidence, and prepare insurer drafts.
                            </p>
                        </div>
                        <div className="text-right flex flex-col items-start sm:items-end gap-1">
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                IRDAI Notice: No payout fees or disbursement QR codes
                            </span>
                            <div className="flex items-center gap-3 text-[11px]">
                                <a
                                    href={IRDAI_BIMA_BHAROSA_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-500 underline hover:text-orange-500 inline-flex items-center gap-0.5"
                                >
                                    IRDAI Bima Bharosa <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                                <a
                                    href={TATA_AIG_CLAIM_DOCS_GUIDE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-500 underline hover:text-orange-500 inline-flex items-center gap-0.5"
                                >
                                    Document Guide <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {claimCases.length === 0 ? (
                        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                            <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                No Saved Claim Cases Yet
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                If you experience a transit lag, flight delay, or cancellation, launch your trip below and click "Start a claim" to build an evidence dossier and insurer email.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {claimCases.map((c) => {
                                const matchingTrip = trips.find(t => t.id === `trip_${c.tripId}` || t.id === c.tripId);
                                const dest = matchingTrip?.trip_details?.destination || "Journey";
                                const { missingRequired, totalCollected, totalItems } = getMissingEvidence(c.evidenceChecklist);

                                return (
                                    <div
                                        key={c.id}
                                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {getIncidentTypeLabel(c.incidentType)}
                                                    </span>
                                                    {c.isSimulatedDisruption && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                                                        >
                                                            Demo Disruption (Ineligible)
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
                                                        {c.status === "sent_by_traveler"
                                                            ? "Email Sent (Awaiting Insurer)"
                                                            : c.status.replace(/_/g, " ").toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <Link
                                                    href={`/trip/${c.tripId}`}
                                                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 mt-0.5"
                                                >
                                                    <MapPin className="h-3 w-3" />
                                                    {dest} • {c.provider}
                                                </Link>
                                            </div>

                                            <div className="text-right text-[11px] text-slate-500">
                                                <span>{c.incidentDate}</span>
                                            </div>
                                        </div>

                                        {/* Evidence Gap Warning */}
                                        {missingRequired.length > 0 ? (
                                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-500/20 p-2 text-[11px] text-red-700 dark:text-red-300 flex items-center gap-1.5">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                                                <span className="line-clamp-1">
                                                    Missing: {missingRequired[0].label} ({totalCollected}/{totalItems} collected)
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 p-2 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                <span>All {totalItems} evidence items collected</span>
                                            </div>
                                        )}

                                        {/* Policy and Follow-up Info */}
                                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-800 pt-2">
                                            <span>
                                                Insurer: <strong>{c.policyDetails?.insurerName || "TATA AIG"}</strong> (Ref: ****{c.policyDetails?.policyNumberLast4 || "----"})
                                            </span>
                                            {c.followUpDate && (
                                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                                    <Clock className="h-3 w-3 text-orange-500" />
                                                    Follow-up: {c.followUpDate}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800 flex-wrap">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7"
                                                onClick={() => handleOpenChecklistModal(c)}
                                            >
                                                <ListChecks className="h-3 w-3 mr-1 text-slate-500" />
                                                Checklist ({totalCollected}/{totalItems})
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7"
                                                onClick={() => handleOpenEmailModal(c)}
                                            >
                                                <Mail className="h-3 w-3 mr-1" />
                                                Email Draft
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7"
                                                onClick={() => handleDownloadPdf(c)}
                                            >
                                                <Download className="h-3 w-3 mr-1" />
                                                PDF
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7"
                                                onClick={() => handleOpenStatusModal(c)}
                                            >
                                                Status
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2"
                                                onClick={(e) => handleDeleteClaimCase(e, c.id)}
                                                title="Delete Claim Case"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Saved Trips Heading */}
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        My Saved Journeys ({trips.length})
                    </h3>
                </div>

                {trips.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-20 text-center"
                    >
                        <div className="mb-6 rounded-full bg-orange-50 dark:bg-orange-500/20 p-6">
                            <MapPin className="h-12 w-12 text-orange-500" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">No trips saved yet</h3>
                        <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
                            You haven't generated any trips yet. Start your journey by creating your first AI-powered itinerary!
                        </p>
                        <Link href="/create-trip">
                            <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600">
                                Create Your First Trip
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {trips.map((trip, index) => (
                            <Link href={`/trip/${trip.id.replace("trip_", "")}`} key={trip.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative h-full overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
                                >
                                    {/* Card Header / Image Placeholder */}
                                    <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                        <img
                                            src={`https://source.unsplash.com/800x600/?${encodeURIComponent(trip.trip_details?.destination || "travel")}`}
                                            alt={trip.trip_details?.destination}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";
                                            }}
                                        />
                                        <div className="absolute top-4 right-4">
                                            <button
                                                onClick={(e) => deleteTrip(e, trip.id)}
                                                className="rounded-full bg-white/90 dark:bg-slate-900/90 p-2 text-red-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                                                title="Delete Trip"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                                                {trip.trip_details?.vibe}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-6">
                                        <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white line-clamp-1">
                                            {trip.trip_details?.destination}
                                        </h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                <Calendar className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.duration}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                <Wallet className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.budget} Budget</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                <Sparkles className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.total_estimated_cost} Est. Cost</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                <Activity className="h-3.5 w-3.5" />
                                                <span>Control Tower Active</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                                <span>Voyage Shield Active</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                                            <span className="text-xs text-slate-400">
                                                Created {new Date(trip.createdAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center text-sm font-semibold text-orange-500 group-hover:translate-x-1 transition-transform">
                                                Launch Mission Control <ArrowRight className="ml-1 h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Email Review Modal */}
            <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-orange-500" />
                                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Insurer Correspondence
                                </DialogTitle>
                            </div>
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold uppercase">
                                Draft — Not Sent
                            </Badge>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Voyage has no configured email service and cannot send emails on your behalf. Review the text, open in your email client, and confirm sending.
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
                                rows={8}
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                className="text-xs font-mono resize-none leading-relaxed"
                            />
                        </div>

                        {/* Send from client actions */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                1. Open or copy into your email app:
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
                                            await navigator.clipboard.writeText(`To: ${emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`);
                                            setCopiedEmail(true);
                                            setTimeout(() => setCopiedEmail(false), 2000);
                                        } catch {
                                            alert("Failed to copy. Please select text manually.");
                                        }
                                    }}
                                >
                                    {copiedEmail ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" /> Copy Text
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Confirmation and follow-up date */}
                        <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-500/30 space-y-2">
                            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                2. Confirm email sent to update case status:
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
                                    onClick={handleConfirmEmailSent}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Confirm I Sent This Email
                                </Button>
                            </div>
                        </div>

                        {/* IRDAI Escalation Info */}
                        <div className="text-[11px] text-slate-500 pt-1 flex items-start gap-1.5">
                            <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                            <span>
                                In accordance with IRDAI rules, registered insurers should respond within 15 days of document submission. If unresponsive or disputed, escalate via{" "}
                                <a
                                    href={IRDAI_GRIEVANCE_FAQ_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-orange-600 dark:text-orange-400"
                                >
                                    IRDAI Bima Bharosa Grievance Redressal
                                </a>
                                .
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Case Status Update Dialog */}
            <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Update Claim Status
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Record external responses received from the insurance provider.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Case Status</Label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as ClaimCaseStatus)}
                                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                            >
                                <option value="draft">Draft (Not Sent)</option>
                                <option value="email_prepared">Email Drafted (Not Sent)</option>
                                <option value="sent_by_traveler">Email Sent by Traveler (Awaiting Insurer)</option>
                                <option value="insurer_acknowledged">Insurer Acknowledged (Reference Assigned)</option>
                                <option value="settled">Settled Externally by Insurer</option>
                                <option value="rejected">Repudiated / Rejected by Insurer</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Notes / Case Reference</Label>
                            <Textarea
                                rows={3}
                                value={statusNotes}
                                onChange={(e) => setStatusNotes(e.target.value)}
                                placeholder="e.g. Insurer assigned reference #TAT-9821, requested original boarding pass..."
                                className="text-xs resize-none"
                            />
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => setStatusModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
                                onClick={handleSaveStatusUpdate}
                            >
                                Save Status
                            </Button>
                        </div>
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
