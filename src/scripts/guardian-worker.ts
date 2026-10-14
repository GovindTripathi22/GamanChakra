/**
 * Trip Guardian Daemon Worker
 * Can be run standalone (e.g. node / ts-node / npx tsx) or scheduled via worker process.
 */
import { db } from "../lib/db";
import { pollTripGuardianItems } from "../lib/guardian/poller";

async function runGuardianCycle() {
  console.log(`[Guardian Worker] Starting active scan at ${new Date().toISOString()}`);
  try {
    const activeTrips = await db.trip.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    console.log(`[Guardian Worker] Found ${activeTrips.length} itineraries to evaluate.`);
    for (const trip of activeTrips) {
      const res = await pollTripGuardianItems(trip.id);
      if (res.disruptionsDetected.length > 0) {
        console.warn(`[Guardian Worker] Detected ${res.disruptionsDetected.length} disruption(s) on trip ${trip.id} (${trip.destination})`);
      }
    }
    console.log(`[Guardian Worker] Cycle completed successfully.`);
  } catch (err) {
    console.error(`[Guardian Worker] Cycle failed:`, err);
  }
}

// Execute cycle if called directly
if (require.main === module) {
  runGuardianCycle().then(() => process.exit(0));
}

export { runGuardianCycle };
