import type { WeatherForecastResult } from "../types";

/**
 * Open-Meteo Weather Provider
 * 100% Free, Zero API Key Required, Open Data
 * Endpoints: https://api.open-meteo.com/v1/forecast
 */
export async function fetchLiveWeather(
  lat: number,
  lng: number
): Promise<WeatherForecastResult> {
  const now = new Date().toISOString();

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "VoyageTravel/1.0 (travel-planner-app)" },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;
    const daily = data.daily;

    const weatherCode = current?.weather_code ?? 0;
    const rainProb = daily?.precipitation_probability_max?.[0] ?? (current?.precipitation > 0 ? 80 : 15);
    const rainMm = current?.precipitation ?? daily?.precipitation_sum?.[0] ?? 0;

    // Interpret WMO weather codes (51-67 = rain, 80-82 = showers, 95-99 = thunderstorm)
    const isRain = weatherCode >= 51 && weatherCode <= 67;
    const isShower = weatherCode >= 80 && weatherCode <= 82;
    const isStorm = weatherCode >= 95 && weatherCode <= 99;
    const isMonsoonAlert = rainMm >= 25 || rainProb >= 75 || isStorm;

    let condition = "Clear";
    if (isStorm) condition = "Thunderstorm & Rain";
    else if (isRain || isShower) condition = "Rain Showers";
    else if (weatherCode >= 1 && weatherCode <= 3) condition = "Partly Cloudy";

    return {
      temperatureC: Math.round(current?.temperature_2m ?? 28),
      apparentTemperatureC: Math.round(current?.apparent_temperature ?? 30),
      condition,
      weatherCode,
      precipitationProbability: rainProb,
      precipitationMm: rainMm,
      isMonsoonAlert,
      monsoonSeverity: isStorm || rainMm >= 40 ? "torrential" : isMonsoonAlert ? "moderate" : "none",
      provenance: {
        source: "Open-Meteo Live API",
        lastCheckedAt: now,
        status: "verified",
        isMock: false,
        confidence: 0.95,
      },
    };
  } catch (error) {
    // Graceful fallback to labeled mock provider with visible [Demo data] provenance
    return {
      temperatureC: 29,
      apparentTemperatureC: 31,
      condition: "Partly Cloudy (Seasonal Estimate)",
      weatherCode: 2,
      precipitationProbability: 25,
      precipitationMm: 2.0,
      isMonsoonAlert: false,
      monsoonSeverity: "none",
      provenance: {
        source: "Voyage Weather Heuristic (Offline Fallback)",
        lastCheckedAt: now,
        status: "estimated",
        isMock: true,
        confidence: 0.7,
      },
    };
  }
}
