"use server";

import { GeneratedTrip } from "@/types/trip";
import { VerifiedTripReport } from "@/types/verification";
import { verifyItinerary } from "@/lib/verification/engine";
import { logAuditEvent } from "@/lib/audit/logger";

export async function verifyTripAction(
  trip: GeneratedTrip,
  tripId: string = "trip_active",
  userId: string = "anonymous_traveler"
): Promise<VerifiedTripReport> {
  const report = await verifyItinerary(trip, tripId);

  // Record audit log for verification run
  try {
    await logAuditEvent({
      actor: "SYSTEM",
      actorId: userId,
      entity: "Verification",
      entityId: tripId,
      event: "verified",
      data: {
        totalItems: report.itemsVerifiedCount,
        overallScore: report.overallScore,
        issuesCount: report.issuesCount,
        criticalIssues: report.criticalIssuesCount,
        status: report.status,
      },
    });
  } catch (e) {
    // Audit logging is resilient and non-blocking
  }

  return report;
}
