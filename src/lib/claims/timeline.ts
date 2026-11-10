import { ClaimIncidentType, IncidentTimelineEvent } from "@/types/claim";
import { getIncidentTypeLabel } from "./checklist";
import type { GeneratedTrip } from "@/types/trip";

export interface GenerateTimelineOptions {
  incidentType: ClaimIncidentType;
  incidentDate: string;
  provider: string;
  description?: string;
  destination: string;
  trip?: GeneratedTrip;
  isSimulatedDisruption?: boolean;
}

/**
 * Builds a chronological incident timeline from journey facts, scheduled itinerary, and disruption details.
 */
export function generateIncidentTimeline({
  incidentType,
  incidentDate,
  provider,
  description,
  destination,
  trip,
  isSimulatedDisruption = false,
}: GenerateTimelineOptions): IncidentTimelineEvent[] {
  const events: IncidentTimelineEvent[] = [];
  const label = getIncidentTypeLabel(incidentType);
  const prov = provider.trim() || "Carrier";

  // 1. Scheduled Departure / Start Event
  let scheduledTime = "09:00";
  let departureTitle = `Scheduled Departure (${prov})`;
  let departureDesc = `Scheduled departure on itinerary to ${destination} via ${prov}.`;

  if (trip?.itinerary?.[0]?.activities?.[0]) {
    const act = trip.itinerary[0].activities[0];
    scheduledTime = act.startTime || "09:00";
    departureTitle = `Scheduled Activity: ${act.title}`;
    departureDesc = act.description || departureDesc;
  }

  events.push({
    id: `tl-sched-1`,
    timestamp: `${incidentDate} ${scheduledTime}`,
    title: departureTitle,
    description: departureDesc,
    source: "scheduled",
  });

  // 2. Incident / Disruption Occurrence Event
  const incidentTitle = isSimulatedDisruption
    ? `Simulated Disruption Demo: ${label}`
    : `${label} Incurred`;

  const incidentDesc = description
    ? description
    : isSimulatedDisruption
    ? `Simulated 75-minute transit lag on approach route to ${destination}.`
    : `Operational disruption occurred with ${prov} affecting journey to ${destination}.`;

  events.push({
    id: `tl-inc-2`,
    timestamp: `${incidentDate} 11:30`,
    title: incidentTitle,
    description: incidentDesc,
    source: isSimulatedDisruption ? "alert" : "carrier_notice",
  });

  // 3. Claims Dossier Assembled Event
  events.push({
    id: `tl-claim-3`,
    timestamp: `${incidentDate} 12:45`,
    title: "Voyage Claims Dossier Assembled",
    description: `Traveler initiated claim file, assembled category-specific evidence checklist, and prepared insurer notification draft.`,
    source: "traveler_note",
  });

  return events;
}
