"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Building,
  Gauge,
  Calendar,
  Sparkles,
  RefreshCw,
  Users,
  BarChart3,
  Play,
} from "lucide-react";
import {
  getDestinationIntelligenceAction,
  getSeasonalForecastAction,
  runMacroScenarioSimulationAction,
} from "@/actions/destination-intelligence";

const DESTINATIONS = [
  "Jaipur",
  "Goa",
  "Kerala",
  "Varanasi",
  "Manali",
  "Udaipur",
  "Ladakh",
  "Srirangam",
  "Madurai",
  "Rameswaram",
  "Kanyakumari",
  "Rishikesh",
  "Amritsar",
  "Hampi",
  "Ooty",
  "Mumbai",
  "Delhi",
  "Agra",
];

export default function DestinationIntelligencePage() {
  const [selectedDestination, setSelectedDestination] = useState<string>("Jaipur");
  const [metrics, setMetrics] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState<
    "festival_surge" | "monsoon_flood" | "transit_strike" | "heatwave"
  >("festival_surge");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  const loadData = async (dest: string) => {
    setLoading(true);
    try {
      const [m, f] = await Promise.all([
        getDestinationIntelligenceAction(dest),
        getSeasonalForecastAction(dest),
      ]);
      setMetrics(m);
      setForecast(f);
      setSimulationResult(null); // Reset scenario on destination switch
    } catch (err) {
      console.error("Failed to load destination intelligence:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDestination);
  }, [selectedDestination]);

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await runMacroScenarioSimulationAction(selectedDestination, scenarioType);
      setSimulationResult(res);
    } catch (err) {
      console.error("Scenario simulation failed:", err);
    } finally {
      setSimulating(false);
    }
  };

  const activeMetric = metrics.find((m) => m.destination === selectedDestination) || metrics[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-500/20 shadow-xs">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Voyage Destination Intelligence
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-mono font-semibold border border-purple-200 dark:border-purple-500/30">
                  Breakthrough 7
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Aggregated macro analytics, seasonal demand forecasting, and systemic scenario stress testing.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadData(selectedDestination)}
            disabled={loading}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-xs w-fit"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            Refresh Telemetry
          </button>
        </div>

        {/* Destination Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest}
              onClick={() => setSelectedDestination(dest)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                selectedDestination === dest
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-xs"
              }`}
            >
              {dest}
            </button>
          ))}
        </div>

        {/* Macro Metrics Cards */}
        {activeMetric && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wider">
                <span>OBSERVED VISITORS</span>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {activeMetric.observedVisitors.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quarterly aggregate (Q1 2026)</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wider">
                <span>HOTEL OCCUPANCY</span>
                <Building className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
                {Math.round(activeMetric.hotelOccupancyRate * 100)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average capacity absorption</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wider">
                <span>AVERAGE ROOM RATE</span>
                <BarChart3 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{activeMetric.avgRoomRateINR.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across 3-star to 5-star inventory</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wider">
                <span>TRANSIT STRESS INDEX</span>
                <Gauge className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                {activeMetric.transitStressIndex.toFixed(2)} / 1.0
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Traffic & platform choke points</div>
            </div>
          </div>
        )}

        {/* 2-Column Section: Seasonal Demand Forecasting & Macro Scenario Stress Testing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Seasonal Forecast (Left 5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Seasonal Demand Curve & Surge Model
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Historical seasonality analysis calibrated to Indian festival cycles and monsoon seasons.
              </p>
            </div>

            {forecast && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block mb-0.5 font-sans font-semibold tracking-wider uppercase">PEAK SEASON WINDOW</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{forecast.peakSeason}</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block mb-0.5 font-sans font-semibold tracking-wider uppercase">ESTIMATED SURGE MULTIPLIER</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{forecast.surgeMultiplier}x base rates</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block mb-0.5 font-sans font-semibold tracking-wider uppercase">RECOMMENDED ADVANCE BOOKING</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{forecast.recommendedAdvanceDays} days ahead</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block mb-0.5 font-sans font-semibold tracking-wider uppercase">BOTTLENECK FACTOR</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">{forecast.highRiskFactor}</span>
                </div>

                <div className="text-[10px] text-slate-500 font-sans text-right">
                  Model provenance: {forecast.confidence}
                </div>
              </div>
            )}
          </div>

          {/* Scenario Stress Simulator (Right 7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Macro Event Scenario Simulator
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Inject external macro shocks into the {selectedDestination} market model to test systemic elasticity and automated mitigations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Simulated Event</label>
                <select
                  value={scenarioType}
                  onChange={(e: any) => setScenarioType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs"
                >
                  <option value="festival_surge">Festival Mega Surge (+45% Demand)</option>
                  <option value="monsoon_flood">Heavy Monsoon Flooding (-35% Occupancy)</option>
                  <option value="transit_strike">Regional Transit Bottleneck (+0.55 Stress)</option>
                  <option value="heatwave">Extreme Heatwave (Time-shift Sightseeing)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-semibold transition shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {simulating ? "Simulating Model..." : "Run Macro Simulation"}
                </button>
              </div>
            </div>

            {simulationResult && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-purple-50/60 dark:bg-slate-950 border border-purple-200 dark:border-purple-500/40 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-purple-200 dark:border-slate-800 pb-2.5">
                  <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400 uppercase">
                    Simulation Output: {simulationResult.scenario}
                  </span>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    Target: {simulationResult.destination}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-purple-100 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">PROJECTED ARR</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      ₹{simulationResult.projectedARR.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-mono font-medium">
                      ({simulationResult.arrDeltaPercentage})
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-purple-100 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">PROJECTED OCCUPANCY</span>
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      {simulationResult.projectedOccupancy}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 block font-mono font-medium">
                      (from {simulationResult.originalOccupancy})
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-purple-100 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">TRANSIT STRESS</span>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {simulationResult.projectedStressIndex}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 block font-mono font-medium">
                      (from {simulationResult.originalStressIndex})
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900/50 border border-emerald-200 dark:border-slate-800 rounded-xl text-xs space-y-1 shadow-xs">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                    AUTONOMOUS SYSTEM RECOMMENDATION:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {simulationResult.recommendation}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
