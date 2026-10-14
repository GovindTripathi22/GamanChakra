import { GeneratedTrip, Activity, DisruptionEvent, RecoveryOption } from "@/types/trip";
import { fetchLiveWeather } from "@/lib/providers/weather/open-meteo-provider";
import { getFlightStatus } from "@/lib/providers/flights/mock-flight-provider";
import { getTrainSchedule } from "@/lib/providers/trains/rail-provider";
import { resolvePlace } from "@/lib/providers/places/nominatim-provider";
import { parseTimeToMinutes, formatMinutesToTime } from "@/lib/gap-detector";
import { authorizeAction } from "@/lib/policy/engine";
import { logAuditEvent } from "@/lib/audit/logger";
import { db } from "@/lib/db";

export interface GuardianScanResult {
  hasDisruption: boolean;
  activeDisruption: DisruptionEvent | null;
  impactSummary: string;
  recoveryOptions: RecoveryOption[];
  healthScore: number;
  lastScannedAt: string;
}

export async function scanTripForDisruptions(
  trip: GeneratedTrip,
  tripId: string = "trip_active",
  simulatedTrigger?: DisruptionEvent
): Promise<GuardianScanResult> {
  const now = new Date().toISOString();

  // 1. If explicit simulation trigger is provided, handle end-to-end
  if (simulatedTrigger) {
    const recoveryOptions = generateRankedRecoveries(trip, simulatedTrigger);
    
    // Attempt database persistence if trip exists in DB
    try {
      const existingTrip = await db.trip.findUnique({ where: { id: tripId } });
      if (existingTrip) {
        const alert = await db.alert.create({
          data: {
            tripId: existingTrip.id,
            kind: simulatedTrigger.type,
            severity: simulatedTrigger.severity,
            source: "Voyage Guardian Simulation Trigger",
            payload: JSON.stringify({
              title: simulatedTrigger.title,
              description: simulatedTrigger.description,
              delayMinutes: simulatedTrigger.delayMinutes,
            }),
          },
        });

        for (const opt of recoveryOptions) {
          await db.recoveryOption.create({
            data: {
              alertId: alert.id,
              plan: JSON.stringify(opt.updatedActivities),
              addedCost: opt.costDelta.amount,
              arrivalDeltaMin: simulatedTrigger.delayMinutes || 45,
              score: opt.confidenceScore,
              explanation: opt.explanation,
            },
          });
        }
      }
    } catch (e) {
      // Non-blocking for unpersisted local storage trips
    }

    return {
      hasDisruption: true,
      activeDisruption: simulatedTrigger,
      impactSummary: `Disruption Detected: ${simulatedTrigger.title}. ${simulatedTrigger.description}`,
      recoveryOptions,
      healthScore: Math.max(45, 100 - (simulatedTrigger.delayMinutes || 60)),
      lastScannedAt: now,
    };
  }

  // 2. Scan Destination Weather for Environmental Disruptions
  let detectedDisruption: DisruptionEvent | null = null;
  const destName = trip.trip_details?.destination || "Delhi";

  try {
    const resolved = await resolvePlace(destName);
    if (resolved) {
      const weather = await fetchLiveWeather(
        resolved.coordinates.lat,
        resolved.coordinates.lng
      );

      // Rain / storm threshold (>70% rain or severe rain code)
      if (weather.precipitationProbability >= 70 || weather.condition.toLowerCase().includes("rain")) {
        detectedDisruption = {
          id: `disrupt-weather-${Date.now()}`,
          type: "weather",
          title: `Monsoon Downpour in ${destName} (${weather.condition})`,
          description: `Live Open-Meteo radar detects ${weather.precipitationProbability}% precipitation probability and heavy cloud cover. Outdoor activities require indoor shelter.`,
          severity: weather.precipitationProbability > 85 ? "critical" : "moderate",
          delayMinutes: 90,
          dayIndex: 1,
          recommendedActionSnippet: "Pivot outdoor sightseeing to indoor heritage museums and artisan centers.",
        };
      }
    }
  } catch (e) {
    // Non-blocking
  }

  // 3. Scan Transportation Steps for Flight/Train Delays
  if (!detectedDisruption && trip.transportation_plan) {
    for (const step of trip.transportation_plan) {
      if (step.mode === "Flight") {
        const flightStatus = await getFlightStatus("6E-204");
        if (flightStatus.delayMinutes > 30) {
          detectedDisruption = {
            id: `disrupt-flight-${Date.now()}`,
            type: "delay",
            title: `Flight Delay (+${flightStatus.delayMinutes} mins)`,
            description: `${flightStatus.airline} flight ${flightStatus.flightNumber} to ${destName} is delayed by ${flightStatus.delayMinutes} minutes due to air traffic clearance.`,
            severity: "moderate",
            delayMinutes: flightStatus.delayMinutes,
            dayIndex: 1,
            recommendedActionSnippet: `Shift first day arrival timeline by ${flightStatus.delayMinutes} minutes.`,
          };
          break;
        }
      }
    }
  }

  if (detectedDisruption) {
    const recoveryOptions = generateRankedRecoveries(trip, detectedDisruption);
    return {
      hasDisruption: true,
      activeDisruption: detectedDisruption,
      impactSummary: detectedDisruption.description,
      recoveryOptions,
      healthScore: 78,
      lastScannedAt: now,
    };
  }

  return {
    hasDisruption: false,
    activeDisruption: null,
    impactSummary: "All systems nominal. Zero active delays or severe weather warnings.",
    recoveryOptions: [],
    healthScore: 98,
    lastScannedAt: now,
  };
}

export function generateRankedRecoveries(
  trip: GeneratedTrip,
  disruption: DisruptionEvent
): RecoveryOption[] {
  const targetDay = disruption.dayIndex || 1;
  const dayPlan =
    trip.itinerary?.find((d) => Number(d.day) === Number(targetDay)) ||
    trip.itinerary?.[0] || { day: 1, theme: "Day 1", activities: [] };

  const activities = [...(dayPlan.activities || [])];
  const delay = disruption.delayMinutes || 60;

  // Option 1: Smart Re-sequence (Time shift)
  const reorderedActivities: Activity[] = activities.map((act, idx) => {
    const startMin = parseTimeToMinutes(act.startTime || "09:00");
    const endMin = parseTimeToMinutes(act.endTime || "11:00");
    const duration = Math.max(60, endMin - startMin);

    const newStart = startMin + delay;
    const newEnd = newStart + duration;

    return {
      ...act,
      startTime: formatMinutesToTime(newStart),
      endTime: formatMinutesToTime(newEnd),
      timeSlot: `${formatMinutesToTime(newStart)} - ${formatMinutesToTime(newEnd)}`,
      status: "rebooked" as const,
      logistics: `Pushed by +${delay}m to accommodate ${disruption.title}`,
    };
  });

  const option1: RecoveryOption = {
    id: `rec-reorder-${Date.now()}`,
    title: `Smart Timeline Re-sequence (+${delay}m shift)`,
    strategy: "reorder",
    badgeText: "Recommended (Lowest Risk)",
    confidenceScore: 94,
    explanation: `Safely pushes all stops on Day ${targetDay} forward by ${delay} minutes. Preserves all planned monument tickets without forfeiting bookings.`,
    tradeOffSummary: `Pushes dinner by ~${delay} minutes. No extra financial spend.`,
    costDelta: { amount: 0, currency: "₹" },
    updatedActivities: reorderedActivities,
  };

  // Option 2: Indoor / Sheltered Substitute
  const substitutedActivities: Activity[] = activities.map((act, idx) => {
    if (idx === 0) {
      return {
        ...act,
        title: "Covered Heritage Artisan Guild & Tea Tasting",
        description: "Indoor cultural walkthrough, royal carpet weaving demonstration, and authentic spiced tea.",
        category: "culture" as const,
        status: "rebooked" as const,
        logistics: "Weather-proof indoor experience protected from rain and heat",
      };
    }
    return act;
  });

  const option2: RecoveryOption = {
    id: `rec-substitute-${Date.now()}`,
    title: "Pivot to Sheltered Indoor Culture",
    strategy: "substitute",
    badgeText: "Weather Resilience",
    confidenceScore: 88,
    explanation: "Replaces vulnerable outdoor stops with confirmed indoor heritage artisans, protecting your schedule from adverse weather.",
    tradeOffSummary: "Replaces open-air viewpoint with covered cultural exhibition.",
    costDelta: { amount: 350, currency: "₹" },
    updatedActivities: substitutedActivities,
  };

  // Option 3: Express Direct Transfer Buffer Recovery
  const option3: RecoveryOption = {
    id: `rec-express-${Date.now()}`,
    title: "Upgrade to Direct Express Transfers",
    strategy: "buffer_relax",
    badgeText: "Pacing Preservation",
    confidenceScore: 82,
    explanation: "Contracts transit travel times between venues by booking dedicated point-to-point app cabs, regaining 45 minutes of lost schedule.",
    tradeOffSummary: "Requires estimated ₹450 cab surcharge.",
    costDelta: { amount: 450, currency: "₹" },
    updatedActivities: activities,
  };

  return [option1, option2, option3];
}
