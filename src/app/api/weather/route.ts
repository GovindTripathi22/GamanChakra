import { handler, json, HttpError } from "@/lib/api";
import { findPlace } from "@/lib/geo/gazetteer";

export const dynamic = "force-dynamic";
const WMO = (c: number) => (c >= 95 ? "Thunderstorm" : c >= 61 || (c >= 51 && c <= 57) || (c >= 80 && c <= 82) ? "Rainy" : c >= 71 && c <= 77 ? "Snow" : c === 45 || c === 48 ? "Fog" : c >= 2 ? "Cloudy" : c === 1 ? "Partly Cloudy" : "Sunny");

/** GET /api/weather?place=Jaipur — 5-day forecast from Open-Meteo (keyless). Honest offline fallback. */
export const GET = handler(async (req) => {
  const name = new URL(req.url).searchParams.get("place")?.split(/->|\||,/)[0]?.trim().slice(0, 80);
  if (!name) throw new HttpError(400, "place is required");
  const p = findPlace(name);
  if (!p) throw new HttpError(404, "Unknown place");
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const d = j.daily ?? {};
    const days = (d.time ?? []).map((t: string, i: number) => ({ date: t, day: new Date(`${t}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), max: Math.round(d.temperature_2m_max?.[i] ?? 0), min: Math.round(d.temperature_2m_min?.[i] ?? 0), rain: d.precipitation_probability_max?.[i] ?? null, condition: WMO(d.weather_code?.[i] ?? 0) }));
    if (!days.length) throw new Error("empty");
    return json({ place: p.name, source: "Open-Meteo live forecast", live: true, days });
  } catch {
    return json({ place: p.name, source: "Forecast unavailable offline", live: false, days: [] });
  }
});
