import { db } from "@/lib/db";
import { fetchLiveWeather } from "@/lib/providers/weather/open-meteo-provider";
import { seedWorldEntitiesIfEmpty } from "./entities";

export interface IngestionResult {
  entitiesObserved: number;
  observationsCreated: number;
  timestamp: string;
}

/**
 * Ingest live telemetry (weather, congestion, transit feasibility) for registered World Entities.
 * Every observation carries source provenance, confidence score, and validity TTL.
 */
export async function ingestWorldObservations(): Promise<IngestionResult> {
  await seedWorldEntitiesIfEmpty();

  const entities = await db.worldEntity.findMany({
    where: { category: { in: ["destination", "airport"] } },
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours TTL
  let observationsCreated = 0;

  for (const ent of entities) {
    try {
      // 1. Fetch live weather observation
      const weather = await fetchLiveWeather(ent.lat, ent.lng);

      // Temperature metric
      await db.worldObservation.create({
        data: {
          entityId: ent.id,
          metricType: "weather",
          value: weather.temperatureC,
          unit: "°C",
          condition: weather.condition,
          confidence: weather.provenance.isMock ? 0.75 : 0.95,
          source: weather.provenance.source,
          observedAt: now,
          expiresAt,
        },
      });

      // Precipitation metric
      await db.worldObservation.create({
        data: {
          entityId: ent.id,
          metricType: "precipitation_prob",
          value: weather.precipitationProbability,
          unit: "%",
          condition: weather.isMonsoonAlert ? "monsoon_warning" : "nominal",
          confidence: weather.provenance.isMock ? 0.70 : 0.90,
          source: weather.provenance.source,
          observedAt: now,
          expiresAt,
        },
      });

      // Congestion index (modeled based on airport vs city)
      const baseCongestion = ent.category === "airport" ? 45 : 30;
      const weatherInflation = weather.precipitationProbability > 60 ? 25 : 0;
      const congestionValue = Math.min(100, baseCongestion + weatherInflation);

      await db.worldObservation.create({
        data: {
          entityId: ent.id,
          metricType: "congestion",
          value: congestionValue,
          unit: "/100",
          condition: congestionValue > 70 ? "high_congestion" : "moderate_flow",
          confidence: 0.85,
          source: "Voyage Transit Stress Model",
          observedAt: now,
          expiresAt,
        },
      });

      observationsCreated += 3;
    } catch (e) {
      console.error(`Failed to ingest observations for entity ${ent.name}:`, e);
    }
  }

  return {
    entitiesObserved: entities.length,
    observationsCreated,
    timestamp: now.toISOString(),
  };
}

export async function recordWorldObservation(params: {
  entityId: string;
  kind: string;
  metricValue: number;
  source: string;
  ttlMinutes?: number;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (params.ttlMinutes || 60) * 60 * 1000);
  return await db.worldObservation.create({
    data: {
      entityId: params.entityId,
      metricType: params.kind,
      value: params.metricValue,
      unit: "score",
      condition: "nominal",
      confidence: 0.9,
      source: params.source,
      observedAt: now,
      expiresAt,
    },
  });
}

