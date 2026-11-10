import { z } from "zod";
import { createHash } from "node:crypto";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { normalizeArticle } from "@/lib/news/pipeline";
import { runAgentCycle } from "@/lib/agent/runner";
import { loadSubjects, matchExposures } from "@/lib/risk/engine";
import { publish, safeJson } from "@/lib/events/bus";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { agentMemoryStore } from "@/lib/agent/memory-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const Body = z.object({ scenario: z.string().min(2).max(40) });

/**
 * POST /api/demo/inject — "Simulate a crisis" for live demos.
 * Inserts a clearly-labelled DRILL event right now and immediately runs one autonomous cycle,
 * so the audience watches the agent sense, think, plan and act in seconds.
 */
export const POST = handler(async (req, { session }) => {
  if (process.env.DISABLE_DEMO === "true") throw new HttpError(404, "Demo mode is disabled");
  const { scenario } = Body.parse(await readJson(req));
  const s = SCENARIOS.find((x) => x.id === scenario);
  if (!s) throw new HttpError(400, "Unknown scenario");
  const now = new Date();
  const n = normalizeArticle({ title: s.title, summary: s.summary, url: `https://voyage.app/drill/${s.id}`, source: "Voyage Drill", sourceKind: "sample", publishedAt: now, lat: s.lat, lng: s.lng, hint: s.hint }, 0.95, now);
  if (!n) throw new HttpError(500, "Could not build the scenario");
  const fingerprint = createHash("sha1").update(`${n.fingerprint}|${now.toISOString()}`).digest("hex").slice(0, 24);
  const dbOk = await isDbAvailable();

  let ev: any = null;
  if (dbOk) {
    try {
      ev = await db.newsEvent.create({
        data: {
          fingerprint, title: n.title, summary: n.summary, url: n.url, source: n.source, sourceKind: "sample", publishedAt: now, lang: "en",
          category: n.category, severity: n.severity, confidence: n.confidence, impactScore: Math.max(n.impactScore, 60), placeName: n.placeName,
          countryCode: n.countryCode, lat: n.lat, lng: n.lng, radiusKm: n.radiusKm, tags: JSON.stringify(n.tags), provenance: "sample",
        },
      });
    } catch {}
  }
  if (!ev) {
    ev = {
      id: `drill_${s.id}_${Date.now()}`,
      fingerprint, title: n.title, summary: n.summary, url: n.url, source: "Voyage Drill", sourceKind: "sample",
      publishedAt: now, lang: "en", category: n.category, severity: n.severity, confidence: n.confidence,
      impactScore: Math.max(n.impactScore, 60), placeName: n.placeName, countryCode: n.countryCode,
      lat: n.lat, lng: n.lng, radiusKm: n.radiusKm, tags: JSON.stringify(n.tags), provenance: "sample",
    };
  }

  // Also make event available to recentEvents in memory
  try {
    const { getInMemoryNewsEvents } = await import("@/lib/news/pipeline");
    const memList = getInMemoryNewsEvents();
    memList.unshift(ev);
  } catch {}

  await publish("news.event", { id: ev.id, title: ev.title, category: ev.category, severity: ev.severity, impactScore: ev.impactScore, placeName: ev.placeName });
  const subjects = await loadSubjects(session!.oid, now);
  const run = await runAgentCycle({ trigger: "manual", orgId: session!.oid, ingest: false, now });

  let assessments: any[] = [];
  if (dbOk) {
    try {
      assessments = await db.riskAssessment.findMany({ where: { newsEventId: ev.id }, orderBy: { score: "desc" }, take: 20 });
    } catch {}
  }
  if (!assessments.length) {
    const directExposures = matchExposures([ev], subjects, now);
    assessments = directExposures.map((x) => ({
      subjectType: x.subject.type,
      subjectId: x.subject.id,
      score: x.score,
      distanceKm: x.distanceKm,
    }));
  }

  let tasks: any[] = [];
  if (dbOk) {
    try {
      tasks = await db.agentTask.findMany({ where: { newsEventId: ev.id, orgId: session!.oid }, orderBy: { createdAt: "asc" } });
    } catch {}
  }
  if (!tasks.length) {
    tasks = agentMemoryStore.listTasks(session!.oid).filter((t) => t.newsEventId === ev.id || t.runId === run.runId);
  }
  const checkinTokens = tasks.filter((t) => t.kind === "checkin" && t.status === "executed").map((t) => {
    const r = safeJson<{ link?: string }>(t.result, {});
    const token = r.link?.split("/checkin/")[1] ?? null;
    return token ? { travelerId: t.subjectId, token } : null;
  }).filter(Boolean);

  return json({
    event: { id: ev.id, title: ev.title, category: ev.category, severity: ev.severity, impactScore: ev.impactScore, placeName: ev.placeName, lat: ev.lat, lng: ev.lng, radiusKm: ev.radiusKm },
    run: { id: run.runId, summary: run.summary, executed: run.executed, proposed: run.proposed, ms: run.ms },
    exposed: assessments.filter((a) => a.subjectType === "traveler").map((a) => {
      const t = subjects.find((x) => x.id === a.subjectId);
      return t ? { id: t.id, name: t.name, destination: t.destination, score: a.score, distanceKm: a.distanceKm, status: "unknown" } : null;
    }).filter(Boolean),
    tasks: tasks.map((t) => ({ id: t.id, kind: t.kind, title: t.title, status: t.status })),
    checkins: checkinTokens,
  });
}, { auth: "required", limit: "agentRun" });
