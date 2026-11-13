/**
 * Autonomous scheduler: when the Next.js server boots, the Chakra agent starts its own loop
 * (SENSE → THINK → PLAN → ACT → REFLECT every AGENT_INTERVAL_MIN minutes). No external cron needed.
 * Disable with AGENT_AUTORUN=false (e.g. when you run `npm run worker` as a separate process).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const isBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";
  if (
    isBuild ||
    process.env.AGENT_AUTORUN !== "true" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }
  const g = globalThis as unknown as { __gcScheduler?: boolean };
  if (g.__gcScheduler) return;
  g.__gcScheduler = true;
  const rawMin = Number(process.env.AGENT_INTERVAL_MIN);
  const minutes = Number.isFinite(rawMin) && rawMin >= 2 ? rawMin : 15;
  const tick = async () => {
    try {
      const { runAgentCycle } = await import("./lib/agent/runner");
      const r = await runAgentCycle({ trigger: "schedule" });
      console.log(`[chakra-agent] cycle ok: ${r.ingest?.inserted ?? 0} new events, ${r.exposures} exposures, ${r.executed} executed, ${r.proposed} proposed (${r.ms} ms)`);
    } catch (e) {
      // Quietly skip overlapping cycles
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already running")) {
        console.warn("[chakra-agent] cycle skipped:", msg);
      }
    }
  };
  const t1 = setTimeout(tick, 30_000);
  const t2 = setInterval(tick, minutes * 60_000);
  t1.unref?.();
  t2.unref?.();
  console.log(`[chakra-agent] autonomous loop armed — every ${minutes} min`);
}
