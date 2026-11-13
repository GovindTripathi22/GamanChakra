"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import type { GeneratedTrip, Activity, DayPlan } from "@/types/trip";
import { calculateTripCost } from "@/lib/cost/engine";
import { logAuditEvent } from "@/lib/audit/logger";
import { findPlace } from "@/lib/geo/gazetteer";
import { resolveRealHotels } from "@/lib/hotels/data";

export interface PersistTripResult {
  success: boolean;
  tripId: string;
  isGuest: boolean;
  error?: string;
}

/**
 * Persist an itinerary and all its items and cost lines into the database.
 * Enforces owner-based authorization, prevents foreign trip overwrites,
 * and executes within an atomic database transaction.
 */
export async function saveTripToDatabase(
  trip: GeneratedTrip,
  customTripId?: string,
  guestSessionId?: string
): Promise<PersistTripResult> {
  try {
    let ownerId = guestSessionId || `guest_${Date.now()}`;
    let isGuest = true;
    let orgId: string | null = null;

    try {
      const userAuth = await auth();
      if (userAuth?.userId) {
        ownerId = userAuth.userId;
        orgId = userAuth.orgId;
        isGuest = false;
      }
    } catch {
      // Unauthenticated / guest session
    }

    const tripId = customTripId || `trip-${Date.now()}`;

    // 1. Authorization check: prevent arbitrary trip ID overwrites
    if (customTripId) {
      const existingTrip = await db.trip.findUnique({
        where: { id: customTripId },
        select: { id: true, ownerId: true },
      });

      if (existingTrip) {
        // If trip belongs to someone else, reject overwrite
        if (existingTrip.ownerId !== ownerId) {
          throw new Error("Unauthorized: Cannot modify a trip owned by another user.");
        }
      }
    }

    const destination = trip.trip_details.destination || "Destination";
    const origin = trip.itinerary[0]?.activities[0]?.title ? "India" : "Delhi";
    const travelers = trip.trip_details.travelers || "2";

    // Extract budget max from the first currency figure (avoid concatenating ranges like "₹25,000 – ₹35,000")
    const firstCurrencyMatch = trip.trip_details.total_estimated_cost?.match(/₹?\s*([\d,]{3,})/);
    const budgetMax = firstCurrencyMatch
      ? parseFloat(firstCurrencyMatch[1].replace(/,/g, ""))
      : 50000;

    // 2. Prepare items data
    const itemsToCreate: any[] = [];
    let previousItemId: string | null = null;

    for (let dayIdx = 0; dayIdx < trip.itinerary.length; dayIdx++) {
      const dayPlan = trip.itinerary[dayIdx];
      for (let actIdx = 0; actIdx < dayPlan.activities.length; actIdx++) {
        const act = dayPlan.activities[actIdx];
        const baseId = act.id || `item-d${dayPlan.day}-a${actIdx + 1}`;
        const stableId = baseId.endsWith(`-${tripId}`) ? baseId : `${baseId}-${tripId}`;

        let itemType = "activity";
        const cat = (act.category || "").toLowerCase();
        if (cat.includes("transit") || cat.includes("flight")) itemType = "flight";
        else if (cat.includes("train") || cat.includes("rail")) itemType = "train";
        else if (cat.includes("bus")) itemType = "bus";
        else if (cat.includes("stay") || cat.includes("hotel")) itemType = "stay";
        else if (cat.includes("food") || cat.includes("meal")) itemType = "meal";

        const costMin = act.estimatedCost?.amount ?? 0;
        const costMax = Math.round(costMin * 1.25);
        const dependsOn = previousItemId ? JSON.stringify([previousItemId]) : "[]";

        itemsToCreate.push({
          id: stableId,
          tripId,
          type: itemType,
          title: act.title,
          startAt: act.startTime || "09:00",
          endAt: act.endTime || "11:00",
          status: act.status || "planned",
          dependsOn,
          costMin,
          costMax,
          costStatus: "estimated",
          meta: JSON.stringify({
            description: act.description,
            timeSlot: act.timeSlot,
            ticketPrice: act.ticket_price,
            logistics: act.logistics,
            crowdLevel: act.crowdLevel,
            offPeakTip: act.offPeakTip,
            bookingTip: act.bookingTip,
            weatherSensitivity: act.prediction?.weatherSensitivity || "outdoor_sheltered",
            coordinates: act.geo_coordinates || act.coordinates,
            isProtectedByShield: act.isProtectedByShield ?? true,
            locationName: act.locationName || act.title,
            dayTheme: dayPlan.theme,
            dailyCostEstimate: dayPlan.dailyCostEstimate,
            diningSuggestion: dayPlan.diningSuggestion,
            proTip: dayPlan.proTip,
            totalDistanceKm: dayPlan.totalDistanceKm,
            tripSnapshot:
              dayIdx === 0 && actIdx === 0
                ? {
                    trip_details: trip.trip_details,
                    transportation_plan: trip.transportation_plan,
                    hotels: trip.hotels,
                  }
                : undefined,
          }),
        });

        previousItemId = stableId;
      }
    }

    // 3. Prepare cost lines data
    const costBreakdown = calculateTripCost(trip);
    const costLinesToCreate = (costBreakdown.lines || []).map((line) => ({
      tripId,
      category: line.category,
      title: line.title,
      amountMin: line.amountMin,
      amountMax: line.amountMax,
      status: line.status,
      source: line.source || "Curated Benchmark",
    }));

    const destPlace = findPlace(destination.split(/->|\|/)[0].trim());

    // 4. Atomic transaction across Trip, Items, and Cost Lines
    await db.$transaction(async (tx) => {
      await tx.trip.upsert({
        where: { id: tripId },
        create: {
          id: tripId,
          ownerId,
          title: `${destination} Exploration (${trip.trip_details.duration})`,
          origin,
          destination,
          travelers,
          budgetMax,
          orgId,
          destLat: destPlace?.lat ?? null,
          destLng: destPlace?.lng ?? null,
          startDate: trip.trip_details?.startDate || new Date().toISOString().slice(0, 10),
          endDate: trip.trip_details?.endDate || new Date(Date.now() + Math.max(1, trip.itinerary.length) * 864e5).toISOString().slice(0, 10),
          status: "planned",
        },
        update: {
          title: `${destination} Exploration (${trip.trip_details.duration})`,
          destination,
          travelers,
          budgetMax,
        },
      });

      // Clear existing items and cost lines to prevent dangling records
      await tx.tripItem.deleteMany({ where: { tripId } });
      await tx.costLine.deleteMany({ where: { tripId } });

      // Insert new items and cost lines
      for (const item of itemsToCreate) {
        await tx.tripItem.create({ data: item });
      }

      for (const line of costLinesToCreate) {
        await tx.costLine.create({ data: line });
      }
    });

    // 5. Audit Log
    await logAuditEvent({
      actor: isGuest ? "USER" : "USER",
      actorId: ownerId,
      entity: "Trip",
      entityId: tripId,
      event: "trip_persisted_to_database",
      data: {
        destination,
        daysCount: trip.itinerary.length,
        itemsCount: itemsToCreate.length,
        budgetMax,
        isGuest,
      },
    });

    return { success: true, tripId, isGuest };
  } catch (err: any) {
    console.error("Error saving trip to database:", err);
    return { success: false, tripId: customTripId || "", isGuest: true, error: err.message };
  }
}

/**
 * Fetch a trip and its items from the database, reconstructing the GeneratedTrip object
 */
export async function getTripFromDatabase(tripId: string): Promise<GeneratedTrip | null> {
  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        items: true,
        costLines: true,
      },
    });

    if (!trip) return null;

    // Group items into days
    const dayMap = new Map<number, Activity[]>();
    const dayMetaMap = new Map<number, {
      theme?: string;
      dailyCostEstimate?: string;
      diningSuggestion?: string;
      proTip?: string;
      totalDistanceKm?: number;
    }>();
    type SavedTripSnapshot = {
      trip_details?: GeneratedTrip["trip_details"];
      transportation_plan?: GeneratedTrip["transportation_plan"];
      hotels?: GeneratedTrip["hotels"];
    };
    let savedSnapshot: SavedTripSnapshot | null = null;

    for (let idx = 0; idx < trip.items.length; idx++) {
      const item = trip.items[idx];
      let meta: any = {};
      try {
        meta = JSON.parse(item.meta || "{}");
      } catch {}

      if (!savedSnapshot && meta.tripSnapshot) {
        savedSnapshot = meta.tripSnapshot as SavedTripSnapshot;
      }

      const dayMatch = item.id.match(/-d(\d+)-/);
      const day = dayMatch ? parseInt(dayMatch[1], 10) : Math.floor(idx / 3) + 1;

      if (!dayMetaMap.has(day) && (meta.dayTheme || meta.dailyCostEstimate || meta.diningSuggestion)) {
        dayMetaMap.set(day, {
          theme: meta.dayTheme,
          dailyCostEstimate: meta.dailyCostEstimate,
          diningSuggestion: meta.diningSuggestion,
          proTip: meta.proTip,
          totalDistanceKm: meta.totalDistanceKm,
        });
      }

      const act: Activity = {
        id: item.id,
        title: item.title,
        description: meta.description || item.title,
        timeSlot: meta.timeSlot || "Morning",
        startTime: item.startAt || "09:00",
        endTime: item.endAt || "11:00",
        ticket_price: meta.ticketPrice || `₹${item.costMin}`,
        logistics: meta.logistics || "",
        crowdLevel: meta.crowdLevel || "moderate",
        offPeakTip: meta.offPeakTip,
        bookingTip: meta.bookingTip,
        category: (item.type as any) || "sightseeing",
        locationName: meta.locationName || item.title,
        status: (item.status as any) || "scheduled",
        isProtectedByShield: meta.isProtectedByShield ?? true,
        geo_coordinates: meta.coordinates || { lat: 26.9124, lng: 75.7873 },
        coordinates: meta.coordinates || { lat: 26.9124, lng: 75.7873 },
      };

      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(act);
    }

    const daysSorted = Array.from(dayMap.keys()).sort((a, b) => a - b);
    const itinerary: DayPlan[] = daysSorted.map((dayNum) => {
      const dm = dayMetaMap.get(dayNum);
      return {
        day: dayNum,
        theme: dm?.theme || `Day ${dayNum} in ${trip.destination}`,
        dailyCostEstimate: dm?.dailyCostEstimate,
        diningSuggestion: dm?.diningSuggestion,
        proTip: dm?.proTip,
        totalDistanceKm: dm?.totalDistanceKm,
        activities: dayMap.get(dayNum) || [],
      };
    });

    const resolvedHotels =
      savedSnapshot?.hotels && savedSnapshot.hotels.length > 0
        ? savedSnapshot.hotels
        : resolveRealHotels(
            trip.destination,
            1,
            parseInt(trip.travelers || "2", 10) || 2,
            trip.budgetMax || 25000
          );

    return {
      trip_details: {
        destination: trip.destination,
        duration: `${itinerary.length} Days`,
        budget: "standard",
        travelers: trip.travelers || "2",
        vibe: "cultural",
        total_estimated_cost: trip.budgetMax ? `₹${trip.budgetMax.toLocaleString("en-IN")}` : "₹25,000",
        startDate: trip.startDate || undefined,
        endDate: trip.endDate || undefined,
        ...(savedSnapshot?.trip_details || {}),
      },
      transportation_plan: savedSnapshot?.transportation_plan || [],
      hotels: resolvedHotels,
      itinerary: itinerary.length > 0 ? (itinerary as any) : [
        {
          day: 1,
          theme: `Arrival in ${trip.destination}`,
          activities: [],
        },
      ],
    };
  } catch (err) {
    console.error("Error retrieving trip from DB:", err);
    return null;
  }
}

/**
 * Fetch trips strictly owned by the caller.
 * Never returns arbitrary customer trips to unauthenticated users.
 */
export async function getUserTripsFromDatabase(guestSessionId?: string): Promise<Array<{
  id: string;
  title: string;
  destination: string;
  travelers: string;
  budgetMax: number;
  status: string;
  createdAt: string;
}>> {
  try {
    let ownerId = "";
    try {
      const userAuth = await auth();
      ownerId = userAuth?.userId || "";
    } catch {}

    // If authenticated, fetch only trips owned by this user
    if (ownerId) {
      const userTrips = await db.trip.findMany({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
      });

      return userTrips.map((t) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        travelers: t.travelers || "2",
        budgetMax: t.budgetMax || 25000,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      }));
    }

    // If unauthenticated guest and guestSessionId provided, return only their session trips
    if (guestSessionId) {
      const guestTrips = await db.trip.findMany({
        where: { ownerId: guestSessionId },
        orderBy: { createdAt: "desc" },
      });

      return guestTrips.map((t) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        travelers: t.travelers || "2",
        budgetMax: t.budgetMax || 25000,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      }));
    }

    // Default unauthenticated with no session returns strictly empty array (no data leakage)
    return [];
  } catch (err) {
    console.error("Error fetching user trips:", err);
    return [];
  }
}

/**
 * Safely delete a trip with owner authorization
 */
export async function deleteTripFromDatabase(
  tripId: string,
  guestSessionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let ownerId = guestSessionId || "";
    try {
      const userAuth = await auth();
      if (userAuth?.userId) ownerId = userAuth.userId;
    } catch {}

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { ownerId: true },
    });

    if (!trip) {
      return { success: false, error: "Trip not found." };
    }

    if (trip.ownerId !== ownerId) {
      return { success: false, error: "Unauthorized: You do not own this trip." };
    }

    await db.$transaction(async (tx) => {
      await tx.trip.delete({ where: { id: tripId } });
    });

    await logAuditEvent({
      actor: "USER",
      actorId: ownerId,
      entity: "Trip",
      entityId: tripId,
      event: "trip_deleted",
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error deleting trip:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Migrate guest trips to authenticated user upon sign-in
 */
export async function migrateGuestTripsToUser(
  guestSessionId: string
): Promise<{ migratedCount: number }> {
  try {
    const userAuth = await auth();
    if (!userAuth?.userId || !guestSessionId) {
      return { migratedCount: 0 };
    }

    const result = await db.trip.updateMany({
      where: { ownerId: guestSessionId },
      data: { ownerId: userAuth.userId },
    });

    return { migratedCount: result.count };
  } catch (err) {
    console.error("Error migrating guest trips:", err);
    return { migratedCount: 0 };
  }
}
