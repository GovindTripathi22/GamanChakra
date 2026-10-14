/**
 * Standalone autonomous worker (for scaled deployments: run 1 worker + N stateless web instances).
 *   AGENT_AUTORUN=false on the web tier, then: npm run worker
 */
import "dotenv/config";
import { runAgentCycle } from "../src/lib/agent/runner";
import { pruneSystemEvents } from "../src/lib/events/bus";

const minutes = Math.max(1, Number(process.env.AGENT_INTERVAL_MIN || 10));
async function loop() {
  const t = Date.now();
  try {
    const r = await runAgentCycle({ trigger: "schedule" });
    console.log(new Date().toISOString(), `cycle ${r.runId}: +${r.ingest?.inserted ?? 0} events (${r.ingest?.mode}), ${r.exposures} exposures, ${r.executed} executed, ${r.proposed} proposed, ${Date.now() - t} ms`);
    await pruneSystemEvents(72);
  } catch (e) {
    console.error(new Date().toISOString(), "cycle failed:", e instanceof Error ? e.message : e);
  }
}
console.log(`Voyage autonomous worker — every ${minutes} min`);
loop();
setInterval(loop, minutes * 60_000);
