import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { riskLeaderboard } from "@/lib/risk/engine";

export const dynamic = "force-dynamic";
/** GET /api/overview — everything Mission Control needs in one round-trip. */
export const GET = handler(async (_req, { session }) => {
  const since = new Date(Date.now() - 24 * 36e5);
  const orgId = session?.oid ?? "__none__";
  const [events24, high24, sampleCount, events, leaderboard, travelers, exposedTravelers, needHelp, executed24, pending, lastRun, org, runs] = await Promise.all([
    db.newsEvent.count({ where: { publishedAt: { gt: since } } }),
    db.newsEvent.count({ where: { publishedAt: { gt: since }, severity: { in: ["high", "critical"] } } }),
    db.newsEvent.count({ where: { publishedAt: { gt: since }, provenance: "sample" } }),
    db.newsEvent.findMany({ where: { publishedAt: { gt: new Date(Date.now() - 72 * 36e5) } }, orderBy: { publishedAt: "desc" }, take: 120 }),
    riskLeaderboard(10),
    db.traveler.count({ where: { orgId, tripEnd: { gt: new Date() } } }),
    db.traveler.count({ where: { orgId, tripEnd: { gt: new Date() }, exposureScore: { gte: 35 } } }),
    db.traveler.count({ where: { orgId, safetyStatus: "needs_help" } }),
    db.agentTask.count({ where: { orgId, status: "executed", createdAt: { gt: since } } }),
    db.agentTask.count({ where: { orgId, status: "proposed" } }),
    db.agentRun.findFirst({ where: { OR: [{ orgId }, { orgId: null }] }, orderBy: { startedAt: "desc" } }),
    session ? db.organization.findUnique({ where: { id: session.oid } }) : null,
    db.agentRun.findMany({ where: { OR: [{ orgId }, { orgId: null }] }, orderBy: { startedAt: "desc" }, take: 6 }),
  ]);
  return json({
    kpis: { events24, high24, travelers, exposedTravelers, needHelp, executed24, pending, sampleMode: sampleCount > 0 && sampleCount === events24 },
    events: events.map((e) => ({ id: e.id, title: e.title, category: e.category, severity: e.severity, impactScore: e.impactScore, placeName: e.placeName, countryCode: e.countryCode, lat: e.lat, lng: e.lng, radiusKm: e.radiusKm, url: e.url, source: e.source, publishedAt: e.publishedAt, provenance: e.provenance })),
    leaderboard, lastRun, runs, org: org ? { name: org.name, autonomyLevel: org.autonomyLevel, plan: org.plan, kind: org.kind } : null,
  });
});
