/**
 * Autonomous scheduler: when the Next.js server boots, the Chakra agent starts its own loop
 * (SENSE → THINK → PLAN → ACT → REFLECT every AGENT_INTERVAL_MIN minutes). No external cron needed.
 * Disable with AGENT_AUTORUN=false (e.g. when you run `npm run worker` as a separate process).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AGENT_AUTORUN === "false" || process.env.NODE_ENV === "test") return;
  const g = globalThis as unknown as { __gcScheduler?: boolean };
  if (g.__gcScheduler) return;
  g.__gcScheduler = true;
  const minutes = Math.max(2, Number(process.env.AGENT_INTERVAL_MIN || 15));
  const tick = async () => {
    try {
      const { runAgentCycle } = await import("./lib/agent/runner");
      const r = await runAgentCycle({ trigger: "schedule" });
      console.log(`[chakra-agent] cycle ok: ${r.ingest?.inserted ?? 0} new events, ${r.exposures} exposures, ${r.executed} executed, ${r.proposed} proposed (${r.ms} ms)`);
    } catch (e) {
      console.warn("[chakra-agent] cycle skipped:", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(tick, 15_000);
  setInterval(tick, minutes * 60_000);
  console.log(`[chakra-agent] autonomous loop armed — every ${minutes} min`);
}
