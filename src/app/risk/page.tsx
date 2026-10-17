"use client";

import React, { useEffect, useState, useCallback } from "react";
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

export default function RiskRadarPage() {
  const [cities, setCities] = useState<CityRiskProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityRiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchingLive, setSearchingLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

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
      } else if (!selectedCity && list.length > 0) {
        setSelectedCity(list[0]);
      }
    } finally {
      setLoading(false);
      setSearchingLive(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    fetchRiskData();
    const interval = setInterval(() => fetchRiskData(search), 60000);
    return () => clearInterval(interval);
  }, []);

  // Debounced live geocoding search when user types a city like "Amravati"
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

  const filteredCities = cities.filter(
    (c) =>
      c.city.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.stateOrRegion.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.country.toLowerCase().includes(search.trim().toLowerCase())
  );

  const badgeColors: Record<CityRiskProfile["riskLevel"], string> = {
    LOW: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    MODERATE: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    CRITICAL: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>24/7 Live Satellite, Weather & Seismic Telemetry</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-orange-500" />
            Global & Regional Risk Radar
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search any city in India or worldwide (e.g., Amravati, Nagpur, Mumbai, Dubai, Tokyo) for live weather, seismic, and transit risk.
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

      {/* Live Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (search.trim()) fetchRiskData(search.trim());
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any city or town (e.g., Amravati, Nagpur, Pune, Shimla, Tokyo)..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searchingLive}
          className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50"
        >
          {searchingLive ? "Scanning..." : "Scan City"}
        </button>
      </form>

      {/* Main Grid: City Cards + Selected City Deep Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: City Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {c.city}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.stateOrRegion}, {c.country} ({c.lat.toFixed(2)}°N, {c.lon.toFixed(2)}°E)
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      badgeColors[c.riskLevel]
                    }`}
                  >
                    {c.riskLevel} · {c.overallScore}/100
                  </span>
                </div>

                {/* Live Weather Strip */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                    <span>{c.weather.tempC}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Wind className="h-3.5 w-3.5 text-sky-500" />
                    <span>{c.weather.windKmh} km/h</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <CloudRain className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{c.weather.precipMm} mm</span>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 truncate">
                  Condition: <span className="font-medium">{c.weather.condition}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Deep Telemetry Inspector */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 h-fit sticky top-24">
          {selectedCity ? (
            <>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCity.city}
                  </h2>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      badgeColors[selectedCity.riskLevel]
                    }`}
                  >
                    Risk Score: {selectedCity.overallScore}/100
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedCity.stateOrRegion}, {selectedCity.country} · Live Telemetry
                </p>
              </div>

              {/* Sub-score bars */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-700 dark:text-slate-300">
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
                  <div className="flex justify-between mb-1 font-medium text-slate-700 dark:text-slate-300">
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
                  <div className="flex justify-between mb-1 font-medium text-slate-700 dark:text-slate-300">
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

              {/* Active Advisories */}
              <div className="space-y-2.5 pt-2">
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
