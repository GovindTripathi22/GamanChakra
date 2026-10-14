import type { Activity, ScheduleGap } from "@/types/trip";

/**
 * Parses a time string (e.g., "09:00", "9:00 AM", "14:30", "2:30 PM", "9:00AM")
 * into total minutes from midnight (0 to 1439).
 * Returns -1 if unparseable.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;

  const clean = timeStr.trim().toLowerCase();

  // Match 12-hour format: "09:30 am", "9:30pm", "2 pm", etc.
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const meridian = match12[3];

    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // Match 24-hour format: "09:00", "14:30", "9:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  // Fallback: search for first occurrence of time like "9:00 am" or "14:00" inside a longer string
  const embedded12 = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (embedded12) {
    let hours = parseInt(embedded12[1], 10);
    const minutes = embedded12[2] ? parseInt(embedded12[2], 10) : 0;
    const meridian = embedded12[3];

    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const embedded24 = clean.match(/(\d{1,2}):(\d{2})/);
  if (embedded24) {
    const hours = parseInt(embedded24[1], 10);
    const minutes = parseInt(embedded24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return -1;
}

/**
 * Formats total minutes from midnight into 24h "HH:MM" format.
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Formats total minutes into friendly 12h format (e.g. "09:00 AM")
 */
export function formatMinutesTo12Hour(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const meridian = hours >= 12 ? "PM" : "AM";
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${meridian}`;
}

/**
 * Extracts effective start and end times in minutes for an activity.
 * If only one time or a range is specified, attempts intelligent parsing.
 */
function getActivityTimeWindow(activity: Activity): { start: number; end: number } {
  let start = parseTimeToMinutes(activity.startTime);
  let end = parseTimeToMinutes(activity.endTime);

  // If not provided, try parsing timeSlot or time string e.g. "09:00 AM - 11:00 AM"
  if (start === -1 || end === -1) {
    const timeStr = activity.timeSlot || activity.time || "";
    const parts = timeStr.split(/-|to/);

    if (parts.length >= 2) {
      if (start === -1) start = parseTimeToMinutes(parts[0]);
      if (end === -1) end = parseTimeToMinutes(parts[1]);
    } else if (parts.length === 1 && start === -1) {
      start = parseTimeToMinutes(parts[0]);
      // Default duration: 90 mins if end not specified
      if (start !== -1 && end === -1) {
        end = start + 90;
      }
    }
  }

  // Ensure end is after start; default to 90 min visit if invalid
  if (start !== -1 && (end === -1 || end <= start)) {
    end = Math.min(1439, start + 90);
  }

  return { start, end };
}

/**
 * Detects schedule gaps of 60 minutes or greater between activities in a day.
 */
export function detectScheduleGaps(
  activities: Activity[],
  dayIndex: number
): ScheduleGap[] {
  if (!activities || activities.length < 2) {
    return [];
  }

  // Filter out any invalid items
  const validActivitiesWithIndex = activities
    .map((act, index) => {
      const window = getActivityTimeWindow(act);
      return { activity: act, index, ...window };
    })
    .filter((item) => item.start !== -1 && item.end !== -1);

  // Sort chronologically by start time
  validActivitiesWithIndex.sort((a, b) => a.start - b.start);

  const gaps: ScheduleGap[] = [];

  for (let i = 0; i < validActivitiesWithIndex.length - 1; i++) {
    const current = validActivitiesWithIndex[i];
    const next = validActivitiesWithIndex[i + 1];

    const gapMinutes = next.start - current.end;

    // Flag gaps of 60 minutes or greater
    if (gapMinutes >= 60) {
      const anchorCoords =
        current.activity.coordinates ||
        current.activity.geo_coordinates || { lat: 0, lng: 0 };

      const anchorLoc =
        current.activity.locationName ||
        current.activity.place_name ||
        current.activity.title ||
        "Previous stop";

      gaps.push({
        dayIndex,
        insertAtIndex: next.index, // Position before the next activity in the original list
        startTime: formatMinutesToTime(current.end),
        endTime: formatMinutesToTime(next.start),
        durationMinutes: gapMinutes,
        anchorCoordinates: anchorCoords,
        anchorLocationName: anchorLoc,
      });
    }
  }

  return gaps;
}
