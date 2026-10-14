"use client";

import { Card } from "@/components/ui/card";
import { Sun, Cloud, CloudRain, CloudSun, CloudLightning, Snowflake, CloudFog, WifiOff } from "lucide-react";
import { useApi } from "@/components/gc/hooks";

interface WeatherWidgetProps { destination: string }
interface Forecast { place: string; source: string; live: boolean; days: { date: string; day: string; max: number; min: number; rain: number | null; condition: string }[] }

const icon = (c: string) => {
  switch (c) {
    case "Sunny": return <Sun className="h-6 w-6 text-yellow-500" />;
    case "Cloudy": return <Cloud className="h-6 w-6 text-gray-400" />;
    case "Rainy": return <CloudRain className="h-6 w-6 text-blue-400" />;
    case "Thunderstorm": return <CloudLightning className="h-6 w-6 text-violet-400" />;
    case "Snow": return <Snowflake className="h-6 w-6 text-sky-300" />;
    case "Fog": return <CloudFog className="h-6 w-6 text-slate-400" />;
    default: return <CloudSun className="h-6 w-6 text-orange-400" />;
  }
};

/** Real 5-day forecast (Open-Meteo, keyless). Previously random mock data — now live, or honestly unavailable. */
export function WeatherWidget({ destination }: WeatherWidgetProps) {
  const place = (destination || "").split(/->|\||,/)[0].trim();
  const { data, loading } = useApi<Forecast>(place ? `/api/weather?place=${encodeURIComponent(place)}` : null);
  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm transition-colors duration-300">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">5-day forecast · {data?.place ?? place}</h3>
        <span className="text-[11px] text-slate-500">{data?.source ?? (loading ? "Loading…" : "")}</span>
      </div>
      {loading && <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/40" />}
      {!loading && data?.days?.length ? (
        <div className="grid grid-cols-5 gap-2">
          {data.days.map((d) => (
            <div key={d.date} className="flex flex-col items-center rounded-xl bg-slate-50 dark:bg-slate-900/50 p-2">
              <span className="text-xs text-slate-500">{d.day}</span>
              <span className="my-2">{icon(d.condition)}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{d.max}°</span>
              <span className="text-[11px] text-slate-500">{d.min}°{d.rain != null ? ` · ${d.rain}%` : ""}</span>
            </div>
          ))}
        </div>
      ) : null}
      {!loading && !data?.days?.length && (
        <p className="flex items-center gap-2 text-sm text-slate-500"><WifiOff className="h-4 w-4" />Live forecast unavailable right now — the agent still monitors weather alerts from the news feed.</p>
      )}
    </Card>
  );
}
