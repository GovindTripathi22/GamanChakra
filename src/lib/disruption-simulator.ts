import type { Activity, DayPlan, DisruptionEvent, RecoveryOption } from "@/types/trip";
import { parseTimeToMinutes, formatMinutesToTime } from "@/lib/gap-detector";

export const PRESET_DISRUPTIONS: DisruptionEvent[] = [
  {
    id: "disrupt-flight-3h",
    type: "delay",
    title: "Flight Delay (+3 Hours)",
    description: "Inbound flight delayed by 180 minutes due to air traffic control congestion and delayed turnaround.",
    severity: "critical",
    delayMinutes: 180,
    dayIndex: 1,
    recommendedActionSnippet: "Compress Day 1 timeline, auto-shift hotel check-in buffer, and move sightseeing to evening.",
  },
  {
    id: "disrupt-monsoon-rain",
    type: "weather",
    title: "Monsoon Torrential Rain Warning",
    description: "Severe torrential rainfall (45mm/hr) detected. Outdoor walking and viewpoints compromised.",
    severity: "critical",
    delayMinutes: 120,
    dayIndex: 1,
    recommendedActionSnippet: "Pivot outdoor sightseeing to covered heritage gallery, pottery studio, and traditional tea lounge.",
  },
  {
    id: "disrupt-train-wl",
    type: "delay",
    title: "Train Waitlist Confirmation Drop",
    description: "Waitlist probability dropped below viable threshold due to surge festival bookings.",
    severity: "moderate",
    delayMinutes: 90,
    dayIndex: 1,
    recommendedActionSnippet: "Deploy Tatkal emergency alert and lock in direct intercity AC express bus backup.",
  },
  {
    id: "disrupt-crowd-choke",
    type: "crowd_spike",
    title: "Landmark Crowd Surge (>3h Queue)",
    description: "Main landmark reached maximum capacity quota. Unreserved ticket queues currently exceed 180 minutes.",
    severity: "moderate",
    delayMinutes: 60,
    dayIndex: 1,
    recommendedActionSnippet: "Reschedule monument to 8:30 AM tomorrow morning and enjoy a hidden artisan courtyard nearby.",
  },
];

/**
 * Evaluates the cascading schedule ripple of a disruption on an itinerary day.
 */
export function analyzeCascadingImpact(dayPlan: DayPlan, disruption: DisruptionEvent): {
  impactSummary: string;
  cascadingFailures: string[];
} {
  const activities = dayPlan.activities || [];
  if (activities.length === 0) {
    return {
      impactSummary: "No scheduled activities found for this day.",
      cascadingFailures: [],
    };
  }

  const failures: string[] = [];
  const delay = disruption.delayMinutes || 60;

  if (disruption.type === "weather") {
    // Flag outdoor activities during afternoon
    const outdoorActs = activities.filter((a) => {
      const cat = a.category;
      return cat === "sightseeing" || cat === "leisure";
    });
    failures.push(`Torrential rain severely compromises ${outdoorActs.length} outdoor activities.`);
    failures.push("Pedestrian transit and open-air photography unsafe or restricted.");
    return {
      impactSummary: `Weather Shock: Afternoon rainfall renders ${outdoorActs.map(a => a.title).slice(0, 2).join(", ")} unviable.`,
      cascadingFailures: failures,
    };
  }

  if (disruption.type === "crowd_spike") {
    failures.push("Ticket wait times increased by 120-180 minutes.");
    failures.push("Subsequent dinner or evening transit times will be missed.");
    return {
      impactSummary: `Capacity Chokepoint: Attraction congestion threatens remainder of Day ${dayPlan.day}.`,
      cascadingFailures: failures,
    };
  }

  // Delay calculation
  const firstAct = activities[0];
  const startMin = parseTimeToMinutes(firstAct.startTime || "09:00");
  const delayedEnd = startMin + delay;

  failures.push(`Initial stop delayed by ${delay} minutes.`);
  if (activities.length > 1) {
    failures.push(`Overlap detected: Activity #2 (${activities[1].title}) start time conflicts with delayed arrival.`);
  }
  if (activities.length > 2) {
    failures.push(`Ripple effect pushes dinner and evening activities past ${formatMinutesToTime(21 * 60)}.`);
  }

  return {
    impactSummary: `Cascading Transit Impact: Schedule pushed back by ${delay} minutes, creating 2 severe timing overlaps.`,
    cascadingFailures: failures,
  };
}

/**
 * Generates deterministic fallback recovery proposals if LLM is unavailable.
 */
export function generateHeuristicRecoveries(
  dayPlan: DayPlan,
  disruption: DisruptionEvent,
  destination: string
): RecoveryOption[] {
  const currentActivities = [...dayPlan.activities];
  const delay = disruption.delayMinutes || 60;

  // Option 1: Adaptive Flow (Smart Re-sequence & Time Shift)
  const resequenced: Activity[] = currentActivities.map((act, idx) => {
    const sMin = parseTimeToMinutes(act.startTime || `${9 + idx * 2}:00`) + delay;
    const eMin = parseTimeToMinutes(act.endTime || `${11 + idx * 2}:00`) + delay;
    const newStart = formatMinutesToTime(Math.min(sMin, 23 * 60));
    const newEnd = formatMinutesToTime(Math.min(eMin, 23 * 60 + 59));
    return {
      ...act,
      timeSlot: `${newStart} - ${newEnd}`,
      startTime: newStart,
      endTime: newEnd,
      crowdLevel: idx === 0 ? "low" : act.crowdLevel,
      offPeakTip: idx === 0 ? "Shifted to shoulder sunset window (fewer crowds)" : act.offPeakTip,
    };
  });

  const opt1: RecoveryOption = {
    id: "rec-smart-resequence",
    title: "Adaptive Flow (Dynamic Time-Shift)",
    strategy: "reorder",
    badgeText: "Recommended Flow",
    confidenceScore: 94,
    explanation: `Pushes the itinerary back by ${delay} minutes while preserving all original reservations and adjusting the final dinner to a serene late evening slot.`,
    tradeOffSummary: "Evening return is pushed back by ~1 hour; all key landmarks preserved.",
    costDelta: { amount: 0, currency: "₹" },
    updatedActivities: resequenced,
  };

  // Option 2: Off-Peak / Indoor Weather Pivot
  const pivoted: Activity[] = currentActivities.map((act, idx) => {
    if (idx === 1 || act.category === "sightseeing") {
      return {
        ...act,
        id: `indoor-pivot-${Date.now()}-${idx}`,
        title: `${destination} Heritage Artisan Guild & Tea Pavilion`,
        place_name: `${destination} Heritage Artisan Guild`,
        description: `Sheltered indoor cultural immersion: master artisan weaving, pottery demonstrations, and single-estate spice tasting safe from adverse weather and long outdoor queues.`,
        details: `Sheltered indoor cultural immersion safe from adverse weather and long outdoor queues.`,
        category: "culture",
        crowdLevel: "low",
        offPeakTip: "Rain-shielded off-peak rate with zero queue wait",
        bookingDeadline: "walk-in",
        ticket_price: "₹350",
        estimatedCost: { amount: 350, currency: "₹" },
        isGapFiller: true,
      };
    }
    return act;
  });

  const opt2: RecoveryOption = {
    id: "rec-indoor-pivot",
    title: "Off-Peak Indoor Pivot (Weather/Crowd Shield)",
    strategy: "substitute",
    badgeText: "Shield & Comfort",
    confidenceScore: 91,
    explanation: "Replaces exposed or overcrowded outdoor stops with an authentic indoor cultural guild and tea lounge within walking distance.",
    tradeOffSummary: "Replaces 1 outdoor monument with a cultural workshop; avoids 2.5-hour wet queue.",
    costDelta: { amount: 350, currency: "₹" },
    updatedActivities: pivoted,
  };

  // Option 3: Pacing Shield & Buffer Recovery
  const bufferProtected = currentActivities.filter((_, idx) => idx !== currentActivities.length - 1);
  // Add relaxing buffer
  const lastAct = bufferProtected[bufferProtected.length - 1];
  const lastEndMin = parseTimeToMinutes(lastAct?.endTime || "17:00");
  const bufferStart = formatMinutesToTime(lastEndMin + 15);
  const bufferEnd = formatMinutesToTime(lastEndMin + 75);

  bufferProtected.push({
    id: `buffer-recovery-${Date.now()}`,
    title: "Autonomous Leisure & Twilight Café Recharge",
    place_name: "Twilight Café Recharge",
    description: "Protected 60-minute recovery buffer to absorb transit fatigue and enjoy quiet neighborhood ambiance.",
    timeSlot: `${bufferStart} - ${bufferEnd}`,
    startTime: bufferStart,
    endTime: bufferEnd,
    category: "buffer",
    locationName: `${destination} Promenade`,
    coordinates: lastAct?.coordinates || { lat: 26.9124, lng: 75.7873 },
    crowdLevel: "low",
    offPeakTip: "Calm golden hour buffer before dinner",
    bookingDeadline: "walk-in",
    ticket_price: "Free",
    estimatedCost: { amount: 0, currency: "₹" },
    isGapFiller: true,
  });

  const opt3: RecoveryOption = {
    id: "rec-pacing-shield",
    title: "Pacing Shield (Recharge & Buffer Guard)",
    strategy: "buffer_relax",
    badgeText: "Burnout Prevention",
    confidenceScore: 88,
    explanation: "Streamlines low-priority peripheral stops and injects a 60-minute leisurely restorative twilight buffer.",
    tradeOffSummary: "Omits 1 minor stop; guarantees a relaxed dinner without rush or fatigue.",
    costDelta: { amount: 0, currency: "₹" },
    updatedActivities: bufferProtected,
  };

  return [opt1, opt2, opt3];
}
