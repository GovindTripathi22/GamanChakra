"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  AlertTriangle,
  Shield,
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Zap,
  Clock,
  Compass,
  ArrowRight,
  Database,
  Sliders,
} from "lucide-react";
import {
  getControlTowerOverview,
  triggerControlTowerTripScan,
  dispatchAutonomousRecovery,
  analyzeAndResolveDisruption,
} from "@/actions/control-tower";

export default function ControlTowerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanningTripId, setScanningTripId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [selectedDisruption, setSelectedDisruption] = useState<any>(null);
  const [recoveryAnalysis, setRecoveryAnalysis] = useState<any>(null);
  const [analyzingRecovery, setAnalyzingRecovery] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await getControlTowerOverview();
      setData(res);
    } catch (e) {
      console.error("Failed to load control tower overview:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleScanTrip = async (tripId: string) => {
    setScanningTripId(tripId);
    setScanMessage(null);
    try {
      const scanRes = await triggerControlTowerTripScan(tripId);
      setScanMessage(
        `Scanned ${scanRes.itemsPolled} itinerary items. Disruptions found: ${scanRes.disruptionsDetected.length}. Alerts created: ${scanRes.alertsCreated}.`
      );
      await loadOverview();
    } catch (e: any) {
      setScanMessage(`Scan failed: ${e.message}`);
    } finally {
      setScanningTripId(null);
    }
  };

  const handleSimulateDisruptionAnalysis = async (trip: any) => {
    setAnalyzingRecovery(true);
    try {
      const sampleDayPlan: any = {
        day: 1,
        theme: "Heritage & Ghats",
        activities: (trip.items || []).slice(0, 4).map((item: any, idx: number) => ({
          id: item.id || `act-${idx}`,
          title: item.title,
          description: item.title,
          timeSlot: "Morning",
          startTime: `${10 + idx * 2}:00`,
          endTime: `${11 + idx * 2}:30`,
          category: item.kind || "sightseeing",
          locationName: trip.destination,
          coordinates: { lat: 26.9124, lng: 75.7873 },
        })),
      };

      const sampleDisruption = {
        id: `disrupt-${Date.now()}`,
        type: "weather" as const,
        title: "Monsoon Downpour & Waterlogging",
        description: `Sudden heavy rainfall in ${trip.destination} rendering scheduled outdoor heritage walk unsafe.`,
        severity: "moderate" as const,
        delayMinutes: 90,
        dayIndex: 0,
      };

      setSelectedDisruption({ trip, disruption: sampleDisruption });
      const analysis = await analyzeAndResolveDisruption(
        sampleDayPlan,
        sampleDisruption,
        trip.destination
      );
      setRecoveryAnalysis(analysis);
    } catch (e) {
      console.error("Disruption analysis failed:", e);
    } finally {
      setAnalyzingRecovery(false);
    }
  };

  const handleDispatchRecovery = async (option: any) => {
    if (!selectedDisruption?.trip) return;
    setDispatching(option.id);
    try {
      await dispatchAutonomousRecovery({
        tripId: selectedDisruption.trip.id,
        actionType: `RECOVERY_${option.strategy.toUpperCase()}`,
        estimatedCostINR: option.costDelta?.amount || 0,
        autonomyLevel: "L2",
      });
      alert(`Recovery dispatched to Autonomous Execution Engine: ${option.title}`);
      await loadOverview();
    } catch (e: any) {
      alert(`Dispatch failed: ${e.message}`);
    } finally {
      setDispatching(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Radar className="w-7 h-7 animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  Voyage Travel Control Tower
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-medium border border-blue-500/30">
                    Breakthrough 4
                  </span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Active schedule monitoring, live anomaly detection, cascading failure graphs & autonomous recovery dispatch.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadOverview}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>ACTIVE ITINERARIES</span>
              <Compass className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {data?.metrics?.activeTrips || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Monitored 24/7 via Guardian</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-amber-900/30 bg-amber-950/10">
            <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
              <span>AT-RISK ITINERARIES</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-400">
              {data?.metrics?.atRiskTrips || 0}
            </div>
            <div className="text-xs text-amber-500/80 mt-1">Negative slack / weather risk</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-rose-900/30 bg-rose-950/10">
            <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
              <span>ACTIVE ALERTS</span>
              <Zap className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-400">
              {data?.metrics?.activeAlerts || 0}
            </div>
            <div className="text-xs text-rose-500/80 mt-1">Deduplicated in 12h window</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>ACTIVE WORKFLOWS</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">
              {data?.metrics?.activeWorkflows || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">L1 / L2 Autonomous Engines</div>
          </div>
        </div>

        {scanMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs font-mono text-blue-300"
          >
            {scanMessage}
          </motion.div>
        )}

        {/* Monitored Trips & Live Scanner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white flex items-center justify-between">
                <span>Active Monitored Trips</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  Auto-resolves true destination coordinates
                </span>
              </h2>

              <div className="mt-4 space-y-3">
                {(!data?.trips || data.trips.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                    No active trips in database yet. Create a trip or run test generator to monitor.
                  </div>
                ) : (
                  data.trips.map((trip: any) => {
                    const atRisk = trip.items?.some((i: any) => i.status === "at_risk");
                    return (
                      <div
                        key={trip.id}
                        className={`p-4 rounded-lg border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          atRisk
                            ? "bg-amber-950/20 border-amber-800/40"
                            : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-base">
                              {trip.destination}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                                atRisk
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              }`}
                            >
                              {atRisk ? "AT RISK" : "NORMAL"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                            <span>ID: {trip.id.slice(0, 12)}...</span>
                            <span>•</span>
                            <span>{trip.items?.length || 0} scheduled activities</span>
                            <span>•</span>
                            <span>₹{trip.budgetTotal || "N/A"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleScanTrip(trip.id)}
                            disabled={scanningTripId === trip.id}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <Radar className={`w-3.5 h-3.5 ${scanningTripId === trip.id ? "animate-spin" : ""}`} />
                            {scanningTripId === trip.id ? "Scanning..." : "Active Scan"}
                          </button>

                          <button
                            onClick={() => handleSimulateDisruptionAnalysis(trip)}
                            className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            Simulate Disruption
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cascading Failure & Autonomous Recovery Panel */}
            {selectedDisruption && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-6 space-y-6 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">
                        Disruption Simulation & Cascading Impact
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedDisruption.disruption.title} ({selectedDisruption.trip.destination})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDisruption(null);
                      setRecoveryAnalysis(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {analyzingRecovery ? (
                  <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                    Analyzing downstream timeline cascading collisions...
                  </div>
                ) : recoveryAnalysis ? (
                  <div className="space-y-6">
                    {/* Impact Summary */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">
                        Cascading Impact Summary
                      </div>
                      <p className="text-sm text-slate-300">
                        {recoveryAnalysis.impactSummary}
                      </p>
                      {recoveryAnalysis.cascadingFailures?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <span className="text-xs font-semibold text-slate-400">Detected Collisions:</span>
                          <ul className="list-disc list-inside text-xs text-rose-300 space-y-0.5">
                            {recoveryAnalysis.cascadingFailures.map((cf: string, i: number) => (
                              <li key={i}>{cf}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* 3 Autonomous Recovery Options */}
                    <div>
                      <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
                        Autonomous Recovery Options (Ready for Execution Engine)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {recoveryAnalysis.options?.map((opt: any) => (
                          <div
                            key={opt.id}
                            className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-slate-700 transition"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {opt.badgeText || opt.strategy}
                                </span>
                                <span className="text-xs font-mono text-emerald-400 font-semibold">
                                  {opt.confidenceScore}% conf
                                </span>
                              </div>
                              <h4 className="font-medium text-white text-sm mb-1.5">{opt.title}</h4>
                              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                                {opt.explanation}
                              </p>
                              <div className="text-[11px] text-slate-500 mb-3">
                                <strong>Trade-off:</strong> {opt.tradeOffSummary}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDispatchRecovery(opt)}
                              disabled={dispatching === opt.id}
                              className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-medium transition flex items-center justify-center gap-1.5 shadow"
                            >
                              <Play className="w-3 h-3" />
                              {dispatching === opt.id ? "Dispatching..." : "1-Tap Dispatch"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </div>

          {/* Right Column: Live Anomaly Alerts & Audit Log */}
          <div className="space-y-6">
            {/* Active Alerts */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-white text-sm flex items-center justify-between mb-3">
                <span>Live Deduplicated Alerts</span>
                <span className="text-[10px] font-mono text-slate-500">12h TTL</span>
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(!data?.alerts || data.alerts.length === 0) ? (
                  <div className="text-xs text-slate-500 p-4 text-center">No active alerts recorded.</div>
                ) : (
                  data.alerts.map((al: any) => (
                    <div
                      key={al.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-amber-300 uppercase font-mono text-[10px]">
                          {al.kind} • {al.severity}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(al.detectedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Source: {al.source}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Audit Log */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-white text-sm flex items-center justify-between mb-3">
                <span>Tamper-Evident Audit Feed</span>
                <span className="text-[10px] font-mono text-emerald-400">Append-Only</span>
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 font-mono text-[11px]">
                {(!data?.recentAudits || data.recentAudits.length === 0) ? (
                  <div className="text-xs text-slate-500 p-4 text-center">No audit records yet.</div>
                ) : (
                  data.recentAudits.map((aud: any) => (
                    <div
                      key={aud.id}
                      className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded text-slate-400"
                    >
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold text-blue-400">[{aud.actor}]</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(aud.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-300 mt-0.5">{aud.event}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {aud.entity} #{aud.entityId}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
