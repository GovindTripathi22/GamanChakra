"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  User,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  getMyProfileAndGrantsAction,
  saveProfileDetailsAction,
  grantConsentAction,
  revokeConsentAction,
  testMaskedProfileViewAction,
} from "@/actions/identity";

export default function ProfileConsentPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Edit form state
  const [displayName, setDisplayName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [preferredDiet, setPreferredDiet] = useState("");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  // New grant state
  const [newGrantee, setNewGrantee] = useState("Air India Connect");
  const [newPurpose, setNewPurpose] = useState("Flight dietary meal & emergency notification");
  const [newAccessLevel, setNewAccessLevel] = useState<"basic_itinerary" | "emergency_medical" | "full_booking">("basic_itinerary");
  const [newDuration, setNewDuration] = useState(30);

  // Privacy preview simulation
  const [testOrg, setTestOrg] = useState("Air India Connect");
  const [maskedPreview, setMaskedPreview] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await getMyProfileAndGrantsAction();
      setProfile(res);
      setDisplayName(res.displayName || "");
      setEmergencyContact(res.emergencyContact || "");
      setPreferredDiet(res.preferredDiet || "");
      setAccessibilityNeeds(res.accessibilityNeeds || "");
      setMedicalNotes(res.medicalNotes || "");
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await saveProfileDetailsAction({
        displayName,
        emergencyContact,
        preferredDiet,
        accessibilityNeeds,
        medicalNotes,
      });
      setProfile(updated);
      alert("Traveler profile saved successfully!");
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGrantConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setGranting(true);
    try {
      await grantConsentAction({
        granteeOrg: newGrantee,
        purpose: newPurpose,
        accessLevel: newAccessLevel,
        durationDays: Number(newDuration),
      });
      await loadProfile();
    } catch (e: any) {
      alert(`Failed to grant consent: ${e.message}`);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeConsent = async (grantId: string) => {
    setRevokingId(grantId);
    try {
      await revokeConsentAction(grantId);
      await loadProfile();
    } catch (e: any) {
      alert(`Revocation failed: ${e.message}`);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRunPrivacySimulation = async (orgToTest: string) => {
    setSimulating(true);
    try {
      const result = await testMaskedProfileViewAction(orgToTest);
      setMaskedPreview(result);
    } catch (e) {
      console.error("Privacy simulation error:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Journey Identity Graph & Consent
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">
                  Breakthrough 5
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Field-level zero-trust privacy, traveler preferences, and time-bounded consent grants.
              </p>
            </div>
          </div>

          <button
            onClick={loadProfile}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition flex items-center gap-2 border border-slate-700 w-fit"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile Form (Left 5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Traveler Profile
            </h2>
            <p className="text-xs text-slate-400">
              Sensitive information is masked by default and only disclosed under active, scoped consent.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Emergency Contact (Encrypted)</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="+91-98765-43210"
                />
                <span className="text-[10px] text-slate-500">Auto-masked as ***-***-XXXX to unconsented parties</span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dietary Preferences</label>
                <input
                  type="text"
                  value={preferredDiet}
                  onChange={(e) => setPreferredDiet(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Jain, Vegan, Gluten-Free"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Accessibility Needs</label>
                <input
                  type="text"
                  value={accessibilityNeeds}
                  onChange={(e) => setAccessibilityNeeds(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Wheelchair access, Ground floor"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Confidential Medical Notes</label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Asthma, Epipen carrier"
                />
                <span className="text-[10px] text-slate-500">Only accessible via emergency_medical consent scope</span>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition shadow flex items-center justify-center gap-2"
              >
                {savingProfile ? "Saving Profile..." : "Save Profile Details"}
              </button>
            </form>
          </div>

          {/* Consent Grants & Privacy Verification (Right 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Grants List */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  Active Scoped Consent Grants
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {profile?.consentGrants?.filter((g: any) => g.status === "active").length || 0} Active
                </span>
              </div>

              <div className="space-y-3">
                {(!profile?.consentGrants || profile.consentGrants.length === 0) ? (
                  <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    No active consent grants issued. Add a grant below.
                  </div>
                ) : (
                  profile.consentGrants.map((grant: any) => {
                    const isActive = grant.status === "active";
                    return (
                      <div
                        key={grant.id}
                        className={`p-3.5 rounded-lg border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isActive
                            ? "bg-slate-950/70 border-slate-800"
                            : "bg-slate-950/30 border-slate-900 opacity-60"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{grant.granteeOrg}</span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                grant.accessLevel === "emergency_medical"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : grant.accessLevel === "full_booking"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {grant.accessLevel}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isActive ? "text-emerald-400" : "text-slate-500"
                              }`}
                            >
                              [{grant.status.toUpperCase()}]
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px]">{grant.purpose}</div>
                          <div className="text-slate-500 text-[10px] font-mono">
                            Expires: {new Date(grant.expiresAt).toLocaleDateString()}
                          </div>
                        </div>

                        {isActive && (
                          <button
                            onClick={() => handleRevokeConsent(grant.id)}
                            disabled={revokingId === grant.id}
                            className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded text-[11px] font-medium transition flex items-center gap-1 self-start md:self-center"
                          >
                            <Trash2 className="w-3 h-3" />
                            {revokingId === grant.id ? "Revoking..." : "Revoke"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grant New Consent */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Issue New Consent Grant
              </h3>

              <form onSubmit={handleGrantConsent} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grantee Organization</label>
                  <input
                    type="text"
                    value={newGrantee}
                    onChange={(e) => setNewGrantee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    placeholder="e.g. Taj Hotels Res"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Access Scope</label>
                  <select
                    value={newAccessLevel}
                    onChange={(e: any) => setNewAccessLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  >
                    <option value="basic_itinerary">basic_itinerary (Name & Diet)</option>
                    <option value="emergency_medical">emergency_medical (Contact & Medical)</option>
                    <option value="full_booking">full_booking (Complete details)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Declared Purpose</label>
                  <input
                    type="text"
                    value={newPurpose}
                    onChange={(e) => setNewPurpose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    placeholder="e.g. Dietary customization and airport assistance"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={granting}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium transition"
                  >
                    {granting ? "Issuing..." : "Authorize Grant"}
                  </button>
                </div>
              </form>
            </div>

            {/* Zero-Trust Privacy Simulator */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    Zero-Trust Privacy Auditor & Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test what external partners or third-party observers see when querying your identity graph.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testOrg}
                  onChange={(e) => setTestOrg(e.target.value)}
                  placeholder="Enter organization name to test"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white flex-1"
                />
                <button
                  onClick={() => handleRunPrivacySimulation(testOrg)}
                  disabled={simulating}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {simulating ? "Querying..." : "Simulate External Query"}
                </button>
              </div>

              {maskedPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Tested Org: {testOrg}</span>
                    <span className="text-emerald-400">Scope: {maskedPreview.appliedScope}</span>
                  </div>
                  <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(maskedPreview.profile, null, 2)}
                  </pre>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
