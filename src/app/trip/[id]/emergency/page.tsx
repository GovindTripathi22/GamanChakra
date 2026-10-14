"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ArrowLeft,
  Printer,
  PhoneCall,
  AlertTriangle,
  Hospital,
  Shield,
  HelpCircle,
  Clock,
  Sparkles,
  Download,
  CheckCircle2,
  BookmarkCheck,
  Building,
  Volume2,
  Calendar,
  CloudRain,
  Flame,
  Wind,
  Waves,
  Eye,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { RouteRiskAnalysis, OfflineEmergencyCard, TravelerEmergencyProfile } from "@/types/emergency";
import { getRouteRiskAssessment, getOfflineEmergencyCard } from "@/actions/emergency";
import type { GeneratedTrip } from "@/types/trip";

export default function TripEmergencyPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<GeneratedTrip | null>(null);
  const [destination, setDestination] = useState<string>("Goa");
  const [loading, setLoading] = useState(true);
  const [riskAnalysis, setRiskAnalysis] = useState<RouteRiskAnalysis | null>(null);
  const [emergencyCard, setEmergencyCard] = useState<OfflineEmergencyCard | null>(null);
  const [activeTab, setActiveTab] = useState<"card" | "radar">("card");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  // Editable traveler profile state
  const [profile, setProfile] = useState<TravelerEmergencyProfile>({
    name: "Aarav Sharma",
    emergencyContactName: "Priya Sharma (Spouse)",
    emergencyContactPhone: "+91 98765 43210",
    bloodGroup: "B+ Positive",
    medicalAllergies: "Penicillin, Tree Nuts (Carries EpiPen)",
    policyNumber: "HDFC-ERGO-TRV-8829410-IN",
    insuranceHelpline: "+91 22 6234 6234 / 1800 2666 400",
  });

  useEffect(() => {
    // 1. Load trip from local storage or cached state
    let targetDest = "Goa";
    const rawTrip = localStorage.getItem(`trip_${tripId}`);
    if (rawTrip) {
      try {
        const parsed = JSON.parse(rawTrip) as GeneratedTrip;
        setTrip(parsed);
        if (parsed.trip_details?.destination) {
          targetDest = parsed.trip_details.destination;
          setDestination(targetDest);
        }
      } catch (e) {
        console.error("Failed to parse trip", e);
      }
    }

    // Check if custom saved profile exists
    const savedProfile = localStorage.getItem(`voyage_profile_${tripId}`);
    let activeProfile = profile;
    if (savedProfile) {
      try {
        const parsedProf = JSON.parse(savedProfile);
        setProfile(parsedProf);
        activeProfile = parsedProf;
      } catch (e) {}
    }

    // 2. Fetch server data
    async function loadData() {
      setLoading(true);
      try {
        const [risk, card] = await Promise.all([
          getRouteRiskAssessment(targetDest),
          getOfflineEmergencyCard(tripId, targetDest, activeProfile),
        ]);
        setRiskAnalysis(risk);
        setEmergencyCard(card);

        // Cache in offline localStorage
        localStorage.setItem(`voyage_emergency_${tripId}`, JSON.stringify(card));
        setIsOfflineCached(true);
      } catch (err) {
        console.error("Error loading emergency data", err);
        // Fallback to cached offline if network unavailable
        const offlineData = localStorage.getItem(`voyage_emergency_${tripId}`);
        if (offlineData) {
          try {
            setEmergencyCard(JSON.parse(offlineData));
            setIsOfflineCached(true);
          } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tripId]);

  const handleSaveProfile = async () => {
    localStorage.setItem(`voyage_profile_${tripId}`, JSON.stringify(profile));
    setIsEditingProfile(false);
    if (destination) {
      const updatedCard = await getOfflineEmergencyCard(tripId, destination, profile);
      setEmergencyCard(updatedCard);
      localStorage.setItem(`voyage_emergency_${tripId}`, JSON.stringify(updatedCard));
    }
  };

  const handleSpeakPhrase = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const getHazardIcon = (type: string) => {
    switch (type) {
      case "monsoon_landslide":
      case "flash_flood":
        return <CloudRain className="h-5 w-5 text-blue-500" />;
      case "heatwave":
        return <Flame className="h-5 w-5 text-amber-500" />;
      case "air_quality":
        return <Wind className="h-5 w-5 text-purple-500" />;
      case "sea_state":
        return <Waves className="h-5 w-5 text-cyan-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-rose-500" />;
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "extreme":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "high":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-black">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #111 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            background: white !important;
            color: black !important;
          }
          .print-badge {
            border: 1px solid #333 !important;
            background: #eee !important;
            color: #000 !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar (Hidden in Print) */}
      <div className="no-print border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/trip/${tripId}`)}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Trip
            </Button>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              <h1 className="font-semibold text-sm md:text-base text-slate-100">
                Safety & Emergency Hub &bull; {destination}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOfflineCached && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1 hidden sm:flex">
                <BookmarkCheck className="h-3 w-3" />
                Offline Ready
              </Badge>
            )}
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-orange-400" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation Tabs (Hidden in Print) */}
        <div className="no-print flex items-center justify-center">
          <div className="inline-flex rounded-full bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("card")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeTab === "card"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Hospital className="h-4 w-4" />
              Offline Emergency Card
            </button>
            <button
              onClick={() => setActiveTab("radar")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeTab === "radar"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Route Risk & Monsoon Radar
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: OFFLINE EMERGENCY CARD (WALLET & A4 PRINT READY)              */}
        {/* ========================================================================= */}
        {activeTab === "card" && emergencyCard && (
          <div className="space-y-6">
            {/* Wallet Header Banner */}
            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-6 shadow-xl print-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-500 text-white font-bold tracking-wider text-xs uppercase px-2.5 py-0.5 print-badge">
                      SOS Offline Travel Card
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Destination: <strong className="text-white">{emergencyCard.destination}</strong>
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    Emergency Medical & Consulate Pass
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Keep a printed copy in your daypack or wallet. Dial 112 nationwide in India.
                  </p>
                </div>

                <div className="no-print flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="border-slate-700 bg-slate-800 text-slate-300 text-xs"
                  >
                    {isEditingProfile ? "Cancel" : "Edit Traveler Details"}
                  </Button>
                </div>
              </div>

              {/* Profile Details (View / Edit) */}
              <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {isEditingProfile ? (
                  <div className="col-span-full space-y-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Traveler Full Name</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Blood Group</label>
                        <Input
                          value={profile.bloodGroup}
                          onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Emergency Contact & Phone</label>
                        <Input
                          value={profile.emergencyContactPhone}
                          onChange={(e) => setProfile({ ...profile, emergencyContactPhone: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Medical Notes & Allergies</label>
                        <Input
                          value={profile.medicalAllergies}
                          onChange={(e) => setProfile({ ...profile, medicalAllergies: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} size="sm" className="bg-rose-600 hover:bg-rose-500 text-white">
                      Save Updated Profile
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Traveler</span>
                      <strong className="text-sm text-slate-100">{profile.name}</strong>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Blood Group</span>
                      <strong className="text-sm text-rose-400 font-bold">{profile.bloodGroup}</strong>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Emergency Contact</span>
                      <strong className="text-sm text-slate-100">{profile.emergencyContactPhone}</strong>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block">Allergies / Medical</span>
                      <strong className="text-sm text-amber-300">{profile.medicalAllergies}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Critical Facilities Grid: Hospital + Police + Embassy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nearest 24x7 Emergency Hospital */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg print-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Hospital className="h-5 w-5" />
                    </div>
                    <div>
                      <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] uppercase font-bold print-badge">
                        24x7 Verified Trauma Care
                      </Badge>
                      <h3 className="font-semibold text-slate-100 text-base mt-0.5">
                        {emergencyCard.nearestHospital.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3">
                  {emergencyCard.nearestHospital.address}
                </p>

                {emergencyCard.nearestHospital.notes && (
                  <p className="text-[11px] text-slate-500 mt-2 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    &bull; {emergencyCard.nearestHospital.notes}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Direct Emergency Phone</span>
                    <strong className="text-rose-400 font-mono text-sm">
                      {emergencyCard.nearestHospital.phone}
                    </strong>
                  </div>
                  <a
                    href={`tel:${emergencyCard.nearestHospital.phone.replace(/[^0-9+]/g, "")}`}
                    className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call Hospital
                  </a>
                </div>
              </div>

              {/* Nearest Police & Tourist Police Station */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg print-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] uppercase font-bold print-badge">
                        Law Enforcement & Safety
                      </Badge>
                      <h3 className="font-semibold text-slate-100 text-base mt-0.5">
                        {emergencyCard.nearestPolice.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3">
                  {emergencyCard.nearestPolice.address}
                </p>

                {emergencyCard.touristPolice && (
                  <div className="mt-3 p-2.5 bg-blue-950/30 rounded-lg border border-blue-800/30 text-xs">
                    <span className="font-semibold text-blue-300 block">Tourist Assistance Police Desk</span>
                    <span className="text-slate-400">{emergencyCard.touristPolice.name} ({emergencyCard.touristPolice.phone})</span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Station Control Room</span>
                    <strong className="text-blue-400 font-mono text-sm">
                      {emergencyCard.nearestPolice.phone} (or 112)
                    </strong>
                  </div>
                  <a
                    href={`tel:${emergencyCard.nearestPolice.phone.replace(/[^0-9+]/g, "")}`}
                    className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call Police
                  </a>
                </div>
              </div>

              {/* International Indian Embassy Card (If applicable) */}
              {emergencyCard.embassy && (
                <div className="md:col-span-2 rounded-2xl border border-amber-500/20 bg-slate-900 p-6 shadow-lg print-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold print-badge">
                        Indian Diplomatic Mission &bull; Consular Emergency
                      </Badge>
                      <h3 className="font-semibold text-slate-100 text-base">
                        {emergencyCard.embassy.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{emergencyCard.embassy.address}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Emergency Helpline: <strong className="text-amber-300">{emergencyCard.embassy.emergencyDirectLine}</strong></span>
                    <a
                      href={`tel:${emergencyCard.embassy.emergencyDirectLine.replace(/[^0-9+]/g, "")}`}
                      className="no-print inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-medium"
                    >
                      Call Embassy
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* All-India Emergency Speed Dial Directory */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg print-card">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-orange-400" />
                Verified National Emergency Helplines
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {emergencyCard.allIndiaHelplines.map((item) => (
                  <div
                    key={item.code}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-2xl font-black text-orange-400 font-mono tracking-tight">
                        {item.number}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {item.purpose}
                      </div>
                    </div>
                    <a
                      href={`tel:${item.number}`}
                      className="no-print mt-2 text-[10px] text-slate-300 hover:text-white bg-slate-800 py-1 rounded-md block transition-colors"
                    >
                      1-Tap Call
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Multilingual Emergency Phrasebook */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg print-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-rose-400" />
                    Essential Emergency Phrases &bull; {emergencyCard.phrases[0]?.language || "Local Language"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Show this card to local helpers or police officers in case of cellular outage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyCard.phrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5 print-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        {phrase.english}
                      </span>
                      <button
                        onClick={() => handleSpeakPhrase(phrase.nativeScript)}
                        className="no-print p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Pronounce phrase"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-lg font-bold text-orange-400 font-sans">
                      {phrase.nativeScript}
                    </div>
                    <div className="text-xs text-slate-400 italic font-mono">
                      &quot;{phrase.phonetic}&quot;
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provenance Footer */}
            <div className="text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 print-card">
              <div>
                Provenance: <strong className="text-slate-400">{emergencyCard.provenance.source}</strong> &bull; Status: <span className="text-emerald-400 uppercase font-semibold">Verified</span>
              </div>
              <div>
                Generated At: {new Date(emergencyCard.offlineGeneratedAt).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: ROUTE RISK & MONSOON RADAR (F6)                               */}
        {/* ========================================================================= */}
        {activeTab === "radar" && riskAnalysis && (
          <div className="space-y-6">
            {/* Risk Meter Summary Header */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={`px-2.5 py-0.5 font-bold uppercase text-xs border ${getRiskBadgeColor(riskAnalysis.overallRiskLevel)}`}>
                      {riskAnalysis.overallRiskLevel} Hazard Risk
                    </Badge>
                    <span className="text-xs text-slate-400">{riskAnalysis.seasonContext}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    Route-Level Hazards & Climate Forecast
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Continuous monitoring of mountain landslides, high-AQI winter smog, and monsoon flash flood points.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-right">
                    <span className="text-[11px] text-slate-400 block">Recommended Transit Buffer</span>
                    <strong className="text-lg font-bold text-orange-400">
                      +{riskAnalysis.totalRecommendedBufferMinutes} mins
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Hazard Cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Detected Environmental Hazards ({riskAnalysis.hazards.length})
              </h3>

              {riskAnalysis.hazards.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200">No Extreme Climate Hazards Detected</p>
                  <p className="text-xs mt-1">Current season parameters on this route remain within normal operating buffers.</p>
                </div>
              ) : (
                riskAnalysis.hazards.map((hazard) => (
                  <div
                    key={hazard.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-md space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                          {getHazardIcon(hazard.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] uppercase font-bold ${getRiskBadgeColor(hazard.severity)}`}>
                              {hazard.severity} Severity
                            </Badge>
                            <span className="text-xs font-semibold text-slate-400">&bull; {hazard.zone}</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-100 mt-0.5">
                            {hazard.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-950/30 px-3 py-1 rounded-full border border-orange-800/30">
                        <Clock className="h-3.5 w-3.5" />
                        Add +{hazard.bufferAdjustmentMinutes}m buffer
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {hazard.explanation}
                    </p>

                    {/* Actionable Prep Steps */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                        Tactical Traveler Action Items:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {hazard.actionablePrep.map((prep, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-400 font-bold">&bull;</span>
                            <span>{prep}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span>Source: <strong className="text-slate-400">{hazard.provenance.source}</strong></span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                        Verified Sourced Data
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Smart Emergency Packing Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Adaptive Route Packing Checklist
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {riskAnalysis.packingChecklist.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-200"
                  >
                    <div className="h-4 w-4 rounded border border-slate-700 flex items-center justify-center text-orange-400 font-bold">
                      &check;
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
