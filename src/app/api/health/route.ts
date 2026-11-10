import { json } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { NANO_INFO } from "@/lib/slm/nano";
import { generativeStatus, generativeAvailable } from "@/lib/slm/generative";

export const dynamic = "force-dynamic";
export async function GET() {
  const t0 = Date.now();
  const dbOk = await isDbAvailable();
  let lastNews: { ingestedAt: Date; provenance: string } | null = null;
  let lastRun: { startedAt: Date; status: string } | null = null;

  if (dbOk) {
    try {
      [lastNews, lastRun] = await Promise.all([
        db.newsEvent.findFirst({ orderBy: { ingestedAt: "desc" }, select: { ingestedAt: true, provenance: true } }).catch(() => null),
        db.agentRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true, status: true } }).catch(() => null),
      ]);
    } catch {
      /* ignore */
    }
  }
  await generativeAvailable();
  return json({
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    slm: { name: NANO_INFO.name, version: NANO_INFO.version, blindEval: (NANO_INFO.report as { blind?: unknown } | undefined)?.blind ?? null },
    generative: generativeStatus(),
    news: { lastIngestedAt: lastNews?.ingestedAt ?? null, provenance: lastNews?.provenance ?? null },
    agent: { lastRunAt: lastRun?.startedAt ?? null, status: lastRun?.status ?? null, autorun: process.env.AGENT_AUTORUN !== "false" },
    version: "3.0.0",
    ms: Date.now() - t0,
  }, dbOk ? 200 : 503);
}
