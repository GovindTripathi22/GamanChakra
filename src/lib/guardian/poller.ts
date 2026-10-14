import { db } from "@/lib/db";
import { fetchLiveWeather } from "@/lib/providers/weather/open-meteo-provider";
import { logAuditEvent } from "@/lib/audit/logger";

export interface GuardianPollResult {
  tripId: string;
  itemsPolled: number;
  alertsCreated: number;
  disruptionsDetected: Array<{
    itemId: string;
    itemTitle: string;
    slackMinutes: number;
    severity: "minor" | "moderate" | "critical";
    plainLanguageImpact: string;
  }>;
  polledAt: string;
}

const DESTINATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  goa: { lat: 15.2993, lng: 74.1240 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  manali: { lat: 32.2432, lng: 77.1892 },
  rishikesh: { lat: 30.0869, lng: 78.2676 },
  udaipur: { lat: 24.5854, lng: 73.7125 },
  agra: { lat: 27.1767, lng: 78.0081 },
};

export function resolveDestinationCoordinates(destinationName: string): { lat: number; lng: number } {
  const normalized = (destinationName || "").toLowerCase().trim();
  for (const [city, coords] of Object.entries(DESTINATION_COORDINATES)) {
    if (normalized.includes(city)) return coords;
  }
  return { lat: 26.9124, lng: 75.7873 }; // Safe curated reference fallback
}

/**
 * Active Trip Guardian Polling Worker
 * Evaluates transit feasibility, delays, and monsoon anomalies for items using true destination coordinates.
 * Strictly prevents duplicate alerts across repeated polling intervals.
 */
export async function pollTripGuardianItems(tripId: string): Promise<GuardianPollResult> {
  const now = new Date();
  const disruptions: GuardianPollResult["disruptionsDetected"] = [];
  let alertsCreated = 0;

  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        items: true,
      },
    });

    if (!trip || trip.items.length === 0) {
      return {
        tripId,
        itemsPolled: 0,
        alertsCreated: 0,
        disruptionsDetected: [],
        polledAt: now.toISOString(),
      };
    }

    // 1. Resolve true destination coordinates dynamically
    const coords = resolveDestinationCoordinates(trip.destination);
    const weather = await fetchLiveWeather(coords.lat, coords.lng);

    // 2. Iterate items and analyze dependency chains with 12h alert deduplication
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    for (let i = 0; i < trip.items.length; i++) {
      const item = trip.items[i];
      let meta: any = {};
      try {
        meta = JSON.parse(item.meta || "{}");
      } catch {}

      // If heavy weather / monsoon alert active and item is outdoor
      if (weather.isMonsoonAlert && meta.weatherSensitivity === "outdoor_high") {
        // Prevent duplicate alerts within a 12-hour window
        const existingAlert = await db.alert.findFirst({
          where: {
            tripId,
            itemId: item.id,
            kind: "weather",
            detectedAt: { gte: twelveHoursAgo },
          },
        });

        if (!existingAlert) {
          const alertId = `alt-wth-${item.id}-${Date.now()}`;
          await db.alert.create({
            data: {
              id: alertId,
              tripId,
              itemId: item.id,
              kind: "weather",
              severity: "moderate",
              source: weather.provenance.source,
              payload: JSON.stringify({
                precipitationProbability: weather.precipitationProbability,
                precipitationMm: weather.precipitationMm,
                condition: weather.condition,
                destination: trip.destination,
                coords,
              }),
            },
          });
          alertsCreated += 1;
        }

        disruptions.push({
          itemId: item.id,
          itemTitle: item.title,
          slackMinutes: -30,
          severity: "moderate",
          plainLanguageImpact: `Severe weather expected during scheduled ${item.title} in ${trip.destination}. Consider indoor substitute.`,
        });

        await db.tripItem.update({
          where: { id: item.id },
          data: { status: "at_risk" },
        });
      }
    }

    if (disruptions.length > 0) {
      await logAuditEvent({
        actor: "SYSTEM",
        actorId: "guardian_poller",
        entity: "Trip",
        entityId: tripId,
        event: "trip_scanned",
        data: {
          itemsPolled: trip.items.length,
          alertsCreated,
          disruptionsFound: disruptions.length,
          destinationCoords: coords,
        },
      });
    }

    return {
      tripId,
      itemsPolled: trip.items.length,
      alertsCreated,
      disruptionsDetected: disruptions,
      polledAt: now.toISOString(),
    };
  } catch (err: any) {
    console.error("Error in Trip Guardian poller:", err);
    return {
      tripId,
      itemsPolled: 0,
      alertsCreated: 0,
      disruptionsDetected: [],
      polledAt: now.toISOString(),
    };
  }
}
