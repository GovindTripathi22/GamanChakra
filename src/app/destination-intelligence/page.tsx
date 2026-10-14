"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  MapPin,
  Calendar,
  AlertTriangle,
  Play,
  RefreshCw,
  Compass,
  Building,
  Users,
  Gauge,
  Sparkles,
} from "lucide-react";
import {
  getDestinationIntelligenceAction,
  getSeasonalForecastAction,
  runMacroScenarioSimulationAction,
} from "@/actions/destination-intelligence";

const DESTINATIONS = ["Jaipur", "Goa", "Varanasi", "Manali", "Kochi", "Delhi"];

export default function DestinationIntelligencePage() {
  const [selectedDestination, setSelectedDestination] = useState("Jaipur");
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);

  // Scenario Simulator State
  const [scenarioType, setScenarioType] = useState<any>("festival_surge");
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  useEffect(() => {
    loadData(selectedDestination);
  }, [selectedDestination]);

  const loadData = async (dest: string) => {
    setLoading(true);
    try {
      const [allMetrics, fcast] = await Promise.all([
        getDestinationIntelligenceAction(dest),
        getSeasonalForecastAction(dest),
      ]);
      setMetrics(allMetrics);
      setForecast(fcast);
    } catch (e) {
      console.error("Failed to load destination intelligence:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await runMacroScenarioSimulationAction(selectedDestination, scenarioType);
      setSimulationResult(res);
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const activeMetric = metrics.find((m) => m.destination === selectedDestination) || metrics[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                KLYP Destination Intelligence
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-medium border border-purple-500/30">
                  Breakthrough 7
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Aggregated macro analytics, seasonal demand forecasting, and systemic scenario stress testing.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadData(selectedDestination)}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition flex items-center gap-2 border border-slate-700 w-fit"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Destination Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest}
              onClick={() => setSelectedDestination(dest)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                selectedDestination === dest
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {dest}
            </button>
          ))}
        </div>

        {/* Macro Metrics Cards */}
        {activeMetric && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>OBSERVED VISITORS</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {activeMetric.observedVisitors.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Quarterly aggregate (Q1 2026)</div>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>HOTEL OCCUPANCY</span>
                <Building className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-400">
                {Math.round(activeMetric.hotelOccupancyRate * 100)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Average capacity absorption</div>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>AVERAGE ROOM RATE</span>
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                ₹{activeMetric.avgRoomRateINR.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Across 3-star to 5-star inventory</div>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>TRANSIT STRESS INDEX</span>
                <Gauge className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-400">
                {activeMetric.transitStressIndex.toFixed(2)} / 1.0
              </div>
              <div className="text-xs text-slate-500 mt-1">Traffic & platform choke points</div>
            </div>
          </div>
        )}

        {/* 2-Column Section: Seasonal Demand Forecasting & Macro Scenario Stress Testing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Seasonal Forecast (Left 5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Seasonal Demand Curve & Surge Model
            </h2>
            <p className="text-xs text-slate-400">
              Historical seasonality analysis calibrated to Indian festival cycles and monsoon seasons.
            </p>

            {forecast && (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 text-[10px] block mb-0.5">PEAK SEASON WINDOW</span>
                  <span className="text-sm font-semibold text-white">{forecast.peakSeason}</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 text-[10px] block mb-0.5">ESTIMATED SURGE MULTIPLIER</span>
                  <span className="text-sm font-semibold text-emerald-400">{forecast.surgeMultiplier}x base rates</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 text-[10px] block mb-0.5">RECOMMENDED ADVANCE BOOKING</span>
                  <span className="text-sm font-semibold text-blue-400">{forecast.recommendedAdvanceDays} days ahead</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 text-[10px] block mb-0.5">BOTTLENECK FACTOR</span>
                  <span className="text-xs text-amber-400 font-semibold">{forecast.highRiskFactor}</span>
                </div>

                <div className="text-[10px] text-slate-500 font-sans text-right">
                  Model provenance: {forecast.confidence}
                </div>
              </div>
            )}
          </div>

          {/* Scenario Stress Simulator (Right 7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Macro Event Scenario Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Inject external macro shocks into the {selectedDestination} market model to test systemic elasticity and automated mitigations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Simulated Event</label>
                <select
                  value={scenarioType}
                  onChange={(e: any) => setScenarioType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
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
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium transition shadow flex items-center justify-center gap-2"
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
                className="p-5 bg-slate-950 border border-purple-500/40 rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                    Simulation Output: {simulationResult.scenario}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Target: {simulationResult.destination}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">PROJECTED ARR</span>
                    <span className="text-sm font-bold text-white">
                      ₹{simulationResult.projectedARR.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-purple-400 block font-mono">
                      ({simulationResult.arrDeltaPercentage})
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">PROJECTED OCCUPANCY</span>
                    <span className="text-sm font-bold text-blue-400">
                      {simulationResult.projectedOccupancy}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      (from {simulationResult.originalOccupancy})
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">TRANSIT STRESS</span>
                    <span className="text-sm font-bold text-amber-400">
                      {simulationResult.projectedStressIndex}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      (from {simulationResult.originalStressIndex})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded text-xs space-y-1">
                  <span className="text-[10px] font-mono font-semibold text-emerald-400">
                    AUTONOMOUS SYSTEM RECOMMENDATION:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
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
