"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
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
  Search,
  X,
  Compass,
  MapPin,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  getDestinationIntelligenceAction,
  getSeasonalForecastAction,
  runMacroScenarioSimulationAction,
} from "@/actions/destination-intelligence";
import {
  DESTINATION_REGIONS,
  DESTINATION_CATEGORIES,
  INDIAN_DESTINATIONS_META,
  type RegionType,
  type CategoryType,
  type DestinationMeta,
} from "@/lib/destination-intelligence/constants";

export default function DestinationIntelligencePage() {
  const [selectedDestination, setSelectedDestination] = useState<string>("Jaipur");
  const [selectedRegion, setSelectedRegion] = useState<RegionType>("All India");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [metrics, setMetrics] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState<
    "festival_surge" | "monsoon_flood" | "transit_strike" | "heatwave"
  >("festival_surge");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Filter destinations based on search, region, and category
  const filteredDestinations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return INDIAN_DESTINATIONS_META.filter((d) => {
      const matchRegion = selectedRegion === "All India" || d.region === selectedRegion;
      const matchCat = selectedCategory === "All" || d.category === selectedCategory;
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q);
      return matchRegion && matchCat && matchSearch;
    });
  }, [selectedRegion, selectedCategory, searchQuery]);

  // Current metadata for selected destination
  const activeMeta = useMemo(() => {
    return (
      INDIAN_DESTINATIONS_META.find(
        (d) => d.name.toLowerCase() === selectedDestination.toLowerCase()
      ) || {
        name: selectedDestination,
        state: "India",
        region: "North" as const,
        category: "Heritage" as const,
      }
    );
  }, [selectedDestination]);

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

  const activeMetric =
    metrics.find(
      (m) => m.destination.toLowerCase() === selectedDestination.toLowerCase()
    ) || metrics[0];

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
                  All India ({INDIAN_DESTINATIONS_META.length} Locations)
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Aggregated macro analytics, seasonal tourism demand curves, and systemic scenario stress testing across every location in India.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadData(selectedDestination)}
            disabled={loading}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-xs w-fit cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            Refresh Telemetry
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          {/* Search Input Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any Indian destination e.g. Amravati, Srirangam, Munnar, Ayodhya, Shirdi, Kaziranga..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-colors shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0 px-1">
              Showing <strong>{filteredDestinations.length}</strong> of {INDIAN_DESTINATIONS_META.length} locations
            </div>
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1 shrink-0 text-[11px] uppercase tracking-wider">
              <Compass className="h-3.5 w-3.5 text-purple-500" />
              Region:
            </span>
            {DESTINATION_REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer text-xs ${
                  selectedRegion === region
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1 shrink-0 text-[11px] uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-blue-500" />
              Type:
            </span>
            {DESTINATION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filtered Destination Pills Container */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {filteredDestinations.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {filteredDestinations.map((dest) => {
                  const isSelected = selectedDestination.toLowerCase() === dest.name.toLowerCase();
                  return (
                    <button
                      key={dest.name}
                      onClick={() => setSelectedDestination(dest.name)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-400/40"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 shadow-xs"
                      }`}
                    >
                      <span>{dest.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                          isSelected
                            ? "bg-purple-700/60 text-purple-100"
                            : "bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {dest.state}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No curated destination match for &ldquo;<strong>{searchQuery}</strong>&rdquo; in {selectedRegion}.
                </p>
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSelectedDestination(searchQuery.trim())}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Inspect &ldquo;{searchQuery.trim()}&rdquo; via Dynamic Telemetry Engine
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Destination Metadata Banner */}
        <div className="p-4 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                  {selectedDestination}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800/50">
                  {activeMeta.state}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800/50">
                  {activeMeta.region} India
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800/50">
                  {activeMeta.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time quarterly capacity telemetry and seasonal impact projections.
              </p>
            </div>
          </div>

          <Link
            href={`/create-trip?destination=${encodeURIComponent(selectedDestination)}`}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs shrink-0"
          >
            Create Trip to {selectedDestination} →
          </Link>
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
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across verified inventory</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wider">
                <span>TRANSIT STRESS INDEX</span>
                <Gauge className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                {activeMetric.transitStressIndex.toFixed(2)} / 1.0
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choke point telemetry index</div>
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
                Historical seasonality analysis calibrated to festival cycles, monsoon belts, and holiday rushes.
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
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block mb-0.5 font-sans font-semibold tracking-wider uppercase">BOTTLENECK / RISK FACTOR</span>
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
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs cursor-pointer"
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
