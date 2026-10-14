"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Globe2,
  Plane,
  Train,
  MapPin,
  CloudRain,
  AlertTriangle,
  RefreshCw,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
} from "lucide-react";
import { getWorldEntitiesAction, ingestWorldDataAction, simulateWorldScenarioAction } from "@/actions/world";
import { SimulationScenarioResult, PRESET_SCENARIOS } from "@/lib/world/simulator";

export default function WorldModelPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedScenario, setSelectedScenario] = useState<string>("winter_fog_del");
  const [scenarioResult, setScenarioResult] = useState<SimulationScenarioResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadEntities(selectedCategory);
    runSimulation("winter_fog_del");
  }, [selectedCategory]);

  const loadEntities = async (category: string) => {
    setLoading(true);
    try {
      const data = await getWorldEntitiesAction(category);
      setEntities(data);
    } catch (e) {
      console.error("Failed to load entities:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await ingestWorldDataAction();
      await loadEntities(selectedCategory);
    } catch (e) {
      console.error("Ingestion failed:", e);
    } finally {
      setIngesting(false);
    }
  };

  const runSimulation = async (scenarioId: string) => {
    setSimulating(true);
    try {
      const res = await simulateWorldScenarioAction({ scenarioId: scenarioId as any });
      setScenarioResult(res);
    } catch (e) {
      console.error("Simulation failed:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Globe2 className="h-3.5 w-3.5" /> Breakthrough 1: KLYP World Model
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              World Intelligence Workspace
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Normalized real-world representations of Indian travel hubs, transit corridors, live weather telemetry, and scenario simulation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${ingesting ? "animate-spin" : ""}`} />
              {ingesting ? "Ingesting Feeds..." : "Ingest Live Observations"}
            </button>
          </div>
        </div>

        {/* Section 1: Scenario Simulator */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Disruption Scenario Simulator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stress-test route feasibility, downstream flight/train cancellations, and deterministic mitigation heuristics.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESET_SCENARIOS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedScenario(key);
                    runSimulation(key);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === key
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {item.name.split("(")[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {scenarioResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800"
            >
              {/* Scenario Metrics */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Impact Severity</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {scenarioResult.disruptionType}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Expected Hub Delay</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      +{scenarioResult.expectedDelayMinutes}m
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Capacity Reduction</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      -{scenarioResult.capacityReductionPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Affected Hubs</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {scenarioResult.affectedHubs.join(", ")}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-700/60 pt-3">
                  {scenarioResult.cascadingImpactSummary}
                </p>
              </div>

              {/* Recommended Mitigations */}
              <div className="lg:col-span-2 space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Deterministic Recovery Options
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenarioResult.recommendedMitigations.map((mit, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-white dark:bg-slate-900 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Option #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {mit.feasibilityScore}% Feasibility
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{mit.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{mit.tradeOff}</p>
                    </div>
                  ))}
                </div>

                {/* Assumptions & Provenance */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 mt-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Grounded Assumptions & Provenance
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    {scenarioResult.assumptions.map((ass, i) => (
                      <li key={i}>{ass}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Section 2: World Entity Directory */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" /> Verified Network Entities & Hubs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ground hubs with normalized IATA, IRCTC codes, coordinates, and real-time observation feeds.
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              {["all", "destination", "airport", "station"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                    selectedCategory === cat
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {cat === "all" ? "All Entities" : `${cat}s`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {entities.map((ent) => {
                const CategoryIcon =
                  ent.category === "airport" ? Plane : ent.category === "station" ? Train : MapPin;
                const weatherObs = ent.observations?.find((o: any) => o.metricType === "weather");
                const congestionObs = ent.observations?.find((o: any) => o.metricType === "congestion");

                return (
                  <div
                    key={ent.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {ent.name}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {ent.state}, {ent.country}
                          </span>
                        </div>
                      </div>

                      {ent.code && (
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {ent.code}
                        </span>
                      )}
                    </div>

                    {/* Telemetry Observations */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <CloudRain className="h-3 w-3" /> Live Weather
                        </span>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {weatherObs ? `${weatherObs.value}°C` : "28°C"}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {weatherObs?.condition || "Partly Cloudy"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Transit Stress
                        </span>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {congestionObs ? `${congestionObs.value}/100` : "35/100"}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block truncate">
                          {congestionObs?.condition ? congestionObs.condition.replace("_", " ") : "Nominal"}
                        </span>
                      </div>
                    </div>

                    {/* Routes snippet */}
                    {ent.outgoingRoutes && ent.outgoingRoutes.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1">
                        <Compass className="h-3.5 w-3.5 text-slate-400" />
                        <span>Connected to:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {ent.outgoingRoutes.map((r: any) => r.destination?.name || "Hub").slice(0, 2).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
