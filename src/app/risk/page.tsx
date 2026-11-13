"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Wind,
  CloudRain,
  Thermometer,
  Activity,
  MapPin,
  Radio,
  ExternalLink,
  CheckCircle2,
  Eye,
  Clock,
  PhoneCall,
  Compass,
  Copy,
  Check,
  Filter,
  ArrowUpDown,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface CityRiskProfile {
  id: string;
  city: string;
  stateOrRegion: string;
  country: string;
  lat: number;
  lon: number;
  overallScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  weatherRisk: number;
  seismicRisk: number;
  transitAndSecurityRisk: number;
  airQualityIndex?: number;
  aqiCategory?: "Good" | "Moderate" | "Sensitive" | "Unhealthy";
  visibilityKm?: number;
  bestTimeWindow?: string;
  transitStatus?: "Normal Operations" | "Minor Delays" | "Weather Caution" | "Disrupted";
  mitigationChecklist?: string[];
  emergencyNumbers?: {
    police: string;
    ambulance: string;
    touristHelpline: string;
  };
  weather: {
    tempC: number;
    windKmh: number;
    gustsKmh: number;
    precipMm: number;
    condition: string;
  };
  advisories: {
    title: string;
    source: string;
    severity: string;
    timestamp: string;
    url?: string;
  }[];
  updatedAt: string;
}

const QUICK_SCAN_CITIES = [
  "Jaipur",
  "Goa",
  "Manali",
  "Varanasi",
  "Kochi",
  "Mumbai",
  "New Delhi",
  "Kathmandu",
  "Dubai",
  "Tokyo",
];

export default function RiskRadarPage() {
  const [cities, setCities] = useState<CityRiskProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityRiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchingLive, setSearchingLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "LOW" | "MODERATE" | "HIGH_CRITICAL">("ALL");
  const [regionFilter, setRegionFilter] = useState<"ALL" | "INDIA" | "INTL">("ALL");
  const [sortBy, setSortBy] = useState<"SCORE_DESC" | "SCORE_ASC" | "NAME_ASC">("SCORE_DESC");
  const [copiedBrief, setCopiedBrief] = useState(false);

  const fetchRiskData = useCallback(async (query = "") => {
    try {
      if (query) setSearchingLive(true);
      else setLoading(true);

      const url = query
        ? `/api/risk?q=${encodeURIComponent(query)}`
        : "/api/risk?q=all";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: CityRiskProfile[] = data.cities || [];
      setCities(list);
      setLastUpdated(data.fetchedAt || new Date().toISOString());

      if (query) {
        const match = list.find((c) =>
          c.city.toLowerCase().includes(query.toLowerCase())
        );
        if (match) setSelectedCity(match);
      } else {
        setSelectedCity((prev) => {
          if (!prev && list.length > 0) return list[0];
          if (prev) {
            const refreshed = list.find((c) => c.city.toLowerCase() === prev.city.toLowerCase());
            return refreshed || prev;
          }
          return null;
        });
      }
    } finally {
      setLoading(false);
      setSearchingLive(false);
    }
  }, []);

  useEffect(() => {
    fetchRiskData();
    const interval = setInterval(() => fetchRiskData(), 60000);
    return () => clearInterval(interval);
  }, [fetchRiskData]);

  // Debounced live geocoding search when user types a city not already in the local list
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) return;
    const hasLocal = cities.some((c) =>
      c.city.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (hasLocal) return;

    const timer = setTimeout(() => {
      fetchRiskData(trimmed);
    }, 450);
    return () => clearTimeout(timer);
  }, [search, cities, fetchRiskData]);

  const summaryStats = useMemo(() => {
    if (cities.length === 0) {
      return { total: 0, lowCount: 0, elevatedCount: 0, avgScore: 0 };
    }
    const lowCount = cities.filter((c) => c.riskLevel === "LOW").length;
    const elevatedCount = cities.filter((c) => c.riskLevel !== "LOW").length;
    const avgScore = Math.round(
      cities.reduce((acc, c) => acc + c.overallScore, 0) / cities.length
    );
    return {
      total: cities.length,
      lowCount,
      elevatedCount,
      avgScore,
    };
  }, [cities]);

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = cities.filter((c) => {
      const matchesQuery =
        !q ||
        c.city.toLowerCase().includes(q) ||
        c.stateOrRegion.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q);
      if (!matchesQuery) return false;

      if (regionFilter === "INDIA" && c.country.toLowerCase() !== "india") return false;
      if (regionFilter === "INTL" && c.country.toLowerCase() === "india") return false;

      if (riskFilter === "LOW" && c.riskLevel !== "LOW") return false;
      if (riskFilter === "MODERATE" && c.riskLevel !== "MODERATE") return false;
      if (
        riskFilter === "HIGH_CRITICAL" &&
        c.riskLevel !== "HIGH" &&
        c.riskLevel !== "CRITICAL"
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "SCORE_DESC") return b.overallScore - a.overallScore;
      if (sortBy === "SCORE_ASC") return a.overallScore - b.overallScore;
      return a.city.localeCompare(b.city);
    });
  }, [cities, search, regionFilter, riskFilter, sortBy]);

  const badgeColors: Record<CityRiskProfile["riskLevel"], string> = {
    LOW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    MODERATE: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
    CRITICAL: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  };

  const handleCopyRiskBrief = () => {
    if (!selectedCity) return;
    const text = [
      `Voyage Telemetry Brief — ${selectedCity.city}, ${selectedCity.stateOrRegion} (${selectedCity.country})`,
      `Risk Score: ${selectedCity.overallScore}/100 (${selectedCity.riskLevel}) | Transit: ${selectedCity.transitStatus || "Normal Operations"}`,
      `Weather: ${selectedCity.weather.condition}, ${selectedCity.weather.tempC}°C | Wind: ${selectedCity.weather.windKmh} km/h | AQI: ${selectedCity.airQualityIndex ?? 65} (${selectedCity.aqiCategory ?? "Moderate"})`,
      `Best Daily Window: ${selectedCity.bestTimeWindow || "07:30 – 11:30 & 16:00 – 20:00"}`,
      `Actionable Mitigation:`,
      ...(selectedCity.mitigationChecklist || []).map((item) => `- ${item}`),
    ].join("\n");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>24/7 Live Satellite, Open-Meteo, AQI & USGS Seismic Telemetry</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-orange-500" />
            Global & Regional Risk Radar
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time weather, seismic, air-quality, and corridor transit advisories across {summaryStats.total || 25} hubs—or geocode any city worldwide on demand.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchRiskData(search.trim())}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading || searchingLive ? "animate-spin" : ""}`} />
            <span>Refresh Live Feed</span>
          </button>
        </div>
      </div>

      {/* 4-Column Telemetry KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Monitored Hubs</span>
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {summaryStats.total}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            India & global transit corridors
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span>Low-Risk Safe Corridors</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {summaryStats.lowCount}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            Clear for normal itinerary pacing
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
            <span>Elevated / Watchlist Hubs</span>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
            {summaryStats.elevatedCount}
          </p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            Weather, AQI, or seismic advisories active
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Network Avg Risk Index</span>
            <Activity className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {summaryStats.avgScore}<span className="text-sm font-semibold text-slate-400">/100</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Composite atmospheric & transit score
          </p>
        </div>
      </div>

      {/* Live Search + Filter Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) fetchRiskData(search.trim());
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any city or town (e.g., Amravati, Nagpur, Manali, Udaipur, Tokyo)..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searchingLive}
            className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            {searchingLive ? "Scanning..." : "Scan City"}
          </button>
        </form>

        {/* Quick-Scan Chips + Risk/Region/Sort Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Quick Scan:
            </span>
            {QUICK_SCAN_CITIES.map((cityName) => {
              const isCurrent = selectedCity?.city.toLowerCase() === cityName.toLowerCase();
              return (
                <button
                  key={cityName}
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRiskFilter("ALL");
                    setRegionFilter("ALL");
                    const found = cities.find(
                      (c) => c.city.toLowerCase() === cityName.toLowerCase()
                    );
                    if (found) setSelectedCity(found);
                    else fetchRiskData(cityName);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                    isCurrent
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cityName}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Region Filter */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0.5 text-xs">
              {(["ALL", "INDIA", "INTL"] as const).map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setRegionFilter(reg)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    regionFilter === reg
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {reg === "ALL" ? "All Regions" : reg === "INDIA" ? "India" : "International"}
                </button>
              ))}
            </div>

            {/* Risk Band Filter */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-400 ml-2" />
              {(
                [
                  { id: "ALL", label: "All Risk" },
                  { id: "LOW", label: "Low" },
                  { id: "MODERATE", label: "Moderate" },
                  { id: "HIGH_CRITICAL", label: "High+" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRiskFilter(item.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    riskFilter === item.id
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <button
              type="button"
              onClick={() =>
                setSortBy((prev) =>
                  prev === "SCORE_DESC"
                    ? "SCORE_ASC"
                    : prev === "SCORE_ASC"
                    ? "NAME_ASC"
                    : "SCORE_DESC"
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-orange-500" />
              <span>
                {sortBy === "SCORE_DESC"
                  ? "Risk: High → Low"
                  : sortBy === "SCORE_ASC"
                  ? "Risk: Low → High"
                  : "City: A → Z"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: City Cards + Selected City Deep Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: City Grid */}
        <div className="lg:col-span-2">
          {filteredCities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No cities match the current filter combination.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRiskFilter("ALL");
                  setRegionFilter("ALL");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCities.map((c) => {
                const isSelected = selectedCity?.city === c.city;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCity(c)}
                    className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 shadow-md"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {c.city}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {c.stateOrRegion}, {c.country} ({c.lat.toFixed(2)}°N, {c.lon.toFixed(2)}°E)
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold shrink-0 tabular-nums ${
                          badgeColors[c.riskLevel]
                        }`}
                      >
                        {c.riskLevel} · {c.overallScore}/100
                      </span>
                    </div>

                    {/* Live Weather & AQI Strip */}
                    <div className="mt-4 grid grid-cols-4 gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs tabular-nums">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                        <Thermometer className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span>{c.weather.tempC}°C</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                        <Wind className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                        <span>{c.weather.windKmh}km/h</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                        <CloudRain className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{c.weather.precipMm}mm</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                        <Eye className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>AQI {c.airQualityIndex ?? 64}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
                      <span className="truncate">
                        Condition: <span className="font-semibold">{c.weather.condition}</span>
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          c.transitStatus === "Normal Operations"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {c.transitStatus || "Normal Operations"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deep Telemetry Inspector */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 h-fit sticky top-24 shadow-xs">
          {selectedCity ? (
            <>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedCity.city}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedCity.stateOrRegion}, {selectedCity.country} · Live Telemetry
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold tabular-nums ${
                      badgeColors[selectedCity.riskLevel]
                    }`}
                  >
                    Risk Score: {selectedCity.overallScore}/100
                  </span>
                </div>

                {/* Operational Transit & AQI Quick Pills */}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
                    Transit: {selectedCity.transitStatus || "Normal Operations"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    AQI {selectedCity.airQualityIndex ?? 64} ({selectedCity.aqiCategory ?? "Moderate"})
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    Visibility: {selectedCity.visibilityKm ?? 9.5} km
                  </span>
                </div>
              </div>

              {/* Sub-score bars */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                    <span>Weather & Atmospheric Risk</span>
                    <span>{selectedCity.weatherRisk}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${selectedCity.weatherRisk}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                    <span>Seismic & Geological Risk (USGS)</span>
                    <span>{selectedCity.seismicRisk}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${selectedCity.seismicRisk}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                    <span>Transit & Ground Advisory Index</span>
                    <span>{selectedCity.transitAndSecurityRisk}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${selectedCity.transitAndSecurityRisk}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Best Sightseeing Window */}
              {selectedCity.bestTimeWindow && (
                <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Recommended Daily Safe Window</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {selectedCity.bestTimeWindow}
                  </p>
                </div>
              )}

              {/* Actionable Mitigation Checklist */}
              {selectedCity.mitigationChecklist && selectedCity.mitigationChecklist.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Traveler Mitigation Checklist</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {selectedCity.mitigationChecklist.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Active Advisories */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-orange-500" />
                  <span>Live Regional Advisories & Feeds</span>
                </h4>
                {selectedCity.advisories.map((adv, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 text-xs space-y-1"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {adv.title}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{adv.source}</span>
                      {adv.url && (
                        <a
                          href={adv.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-orange-500 hover:underline"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Emergency Helpline Strip */}
              {selectedCity.emergencyNumbers && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <PhoneCall className="h-3.5 w-3.5 text-rose-500" />
                    <span>Emergency Helplines ({selectedCity.country})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                    <div>
                      <span className="text-slate-400 block">Police</span>
                      <span className="font-bold">{selectedCity.emergencyNumbers.police}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Ambulance</span>
                      <span className="font-bold">{selectedCity.emergencyNumbers.ambulance}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tourist Desk</span>
                      <span className="font-bold">{selectedCity.emergencyNumbers.touristHelpline}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Plan Protected Trip & Copy Brief */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Link
                  href={`/create-trip?destination=${encodeURIComponent(selectedCity.city)}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
                >
                  <Compass className="h-4 w-4" />
                  <span>Plan Trip to {selectedCity.city}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCopyRiskBrief}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {copiedBrief ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied Brief</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy Brief</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                Last synced: {new Date(lastUpdated || selectedCity.updatedAt).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Select a city to view telemetry.</p>
          )}
        </div>
      </div>
    </div>
  );
}
