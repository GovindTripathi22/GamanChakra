import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pollTripGuardianItems } from "@/lib/guardian/poller";
import { logAuditEvent } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

/**
 * Scheduled Control Tower Monitoring Cron Endpoint
 * Polls active itineraries, evaluates live disruptions, and deduplicates alerts.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Protect cron endpoint in production if CRON_SECRET is configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  try {
    // Find active trips (or trips created within the last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeTrips = await db.trip.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      take: 25,
      orderBy: { updatedAt: "desc" },
    });

    const results = [];
    for (const trip of activeTrips) {
      const result = await pollTripGuardianItems(trip.id);
      results.push(result);
    }

    await logAuditEvent({
      actor: "SYSTEM",
      actorId: "cron_monitor",
      entity: "ControlTower",
      entityId: "global",
      event: "cron_poll_completed",
      data: {
        tripsPolled: activeTrips.length,
        totalAlertsCreated: results.reduce((sum, r) => sum + r.alertsCreated, 0),
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      polledTripsCount: activeTrips.length,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Control tower cron monitor failure:", error);
    return NextResponse.json(
      { error: "Failed to execute monitoring cycle", details: error.message },
      { status: 500 }
    );
  }
}
