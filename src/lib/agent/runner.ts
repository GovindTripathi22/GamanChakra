import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { publish, safeJson } from "@/lib/events/bus";
import { ingestNews, type IngestResult } from "@/lib/news/pipeline";
import { loadSubjects, matchExposures, recentEvents, type Exposure } from "@/lib/risk/engine";
import { playbookFor, type TaskSpec } from "./playbooks";
import { ruleMatches, tasksFromRule } from "./automations";
import { decide, TASK_POLICY, type TaskKind } from "./policy";
import { executeTask } from "./executor";
import { generate, generativeAvailable, CHAKRA_SYSTEM_PROMPT } from "@/lib/slm/generative";
import { NANO_INFO } from "@/lib/slm/nano";

export interface AgentCycleOptions {
  trigger: "schedule" | "manual" | "news" | "voice" | "automation";
  orgId?: string | null;
  ingest?: boolean;
  newsMode?: "auto" | "live" | "drill";
  maxTasks?: number;
  now?: Date;
}

export interface AgentCycleResult {
  runId: string;
  ingest: IngestResult | null;
  exposures: number;
  tasksCreated: number;
  executed: number;
  proposed: number;
  summary: string;
  ms: number;
}

const g = globalThis as unknown as { __gcAgentRunning?: boolean; __gcAgentStartedAt?: number };

/**
 * One autonomous cycle — SENSE → THINK → PLAN → ACT → REFLECT.
 * Every step is persisted (AgentRun/AgentStep) and streamed live to the UI, so the agent is fully auditable.
 */
export async function runAgentCycle(opts: AgentCycleOptions): Promise<AgentCycleResult> {
  // Scheduled cycles are serialised (with a stale-lock timeout); manual/voice runs may overlap safely (idempotent).
  const isScheduled = opts.trigger === "schedule";
  if (isScheduled) {
    if (g.__gcAgentRunning && Date.now() - (g.__gcAgentStartedAt ?? 0) < 15 * 60_000) throw new Error("A cycle is already running");
    g.__gcAgentRunning = true;
    g.__gcAgentStartedAt = Date.now();
  }
  try {
    return await runAgentCycleInner(opts);
  } finally {
    if (isScheduled) g.__gcAgentRunning = false;
  }
}

function safeStringify(v: unknown, max = 20000): string {
  let out: string;
  try { out = JSON.stringify(v ?? {}); } catch { out = JSON.stringify({ unserializable: true }); }
  return out.length <= max ? out : JSON.stringify({ truncated: true, preview: out.slice(0, max - 200) });
}

async function runAgentCycleInner(opts: AgentCycleOptions): Promise<AgentCycleResult> {
  const t0 = Date.now();
  const now = opts.now ?? new Date();
  const useGen = await generativeAvailable();
  const run = await db.agentRun.create({ data: { orgId: opts.orgId ?? null, trigger: opts.trigger, goal: "Protect every active trip and traveller from real-world events", model: useGen ? `${NANO_INFO.name} + local generative SLM` : NANO_INFO.name } });
  let idx = 0;
  const step = async (phase: string, thought: string, tool: string | null, input: unknown, output: unknown, ms = 0) => {
    const s = await db.agentStep.create({ data: { runId: run.id, idx: idx++, phase, thought, tool, input: safeStringify(input, 5000), output: safeStringify(output), durationMs: ms } });
    await publish("agent.step", { runId: run.id, idx: s.idx, phase, thought, tool }, opts.orgId ?? null);
  };
  await publish("agent.run", { runId: run.id, status: "running", trigger: opts.trigger }, opts.orgId ?? null);

  try {
    // ---------- SENSE ----------
    let ingest: IngestResult | null = null;
    const subjects = await loadSubjects(opts.orgId, now);
    if (opts.ingest !== false) {
      const t = Date.now();
      const watchCities = [...new Set(subjects.map((s) => s.destination.split(/[|,]/)[0].trim()))].slice(0, 8);
      ingest = await ingestNews({ watchCities, mode: opts.newsMode, now });
      const okSources = ingest.sources.filter((s) => s.ok).length;
      await step("sense", `Pulled ${ingest.fetched} items from ${okSources}/${ingest.sources.length} sources (${ingest.mode}); ${ingest.inserted} new travel-relevant events after de-duplication.`, "ingest_news", { watchCities }, { inserted: ingest.inserted, mode: ingest.mode, top: ingest.topEvents.slice(0, 5), sources: ingest.sources }, Date.now() - t);
    }

    // ---------- THINK ----------
    const t1 = Date.now();
    const events = await recentEvents(72, now);
    const exposures = matchExposures(events, subjects, now);
    for (const x of exposures.slice(0, 400)) {
      await db.riskAssessment.upsert({
        where: { subjectType_subjectId_newsEventId: { subjectType: x.subject.type, subjectId: x.subject.id, newsEventId: x.event.id } },
        create: { subjectType: x.subject.type, subjectId: x.subject.id, newsEventId: x.event.id, score: x.score, distanceKm: x.distanceKm, reason: x.reason },
        update: { score: x.score, distanceKm: x.distanceKm, reason: x.reason },
      });
    }
    // Update traveller exposure scores (max over events)
    const maxByTraveler = new Map<string, number>();
    for (const x of exposures) if (x.subject.type === "traveler") maxByTraveler.set(x.subject.id, Math.max(maxByTraveler.get(x.subject.id) ?? 0, x.score));
    for (const s of subjects.filter((s) => s.type === "traveler")) await db.traveler.update({ where: { id: s.id }, data: { exposureScore: maxByTraveler.get(s.id) ?? 0 } }).catch(() => {});
    const exposed = new Set(exposures.map((x) => `${x.subject.type}:${x.subject.id}`)).size;
    await step("think", `Matched ${events.length} live events against ${subjects.length} trips/travellers → ${exposures.length} exposures across ${exposed} subjects. Highest: ${exposures[0] ? `${exposures[0].subject.name} (${exposures[0].score}/100, ${exposures[0].event.category})` : "none"}.`, "match_exposures", { events: events.length, subjects: subjects.length }, { exposures: exposures.slice(0, 15).map((x) => ({ subject: x.subject.name, dest: x.subject.destination, event: x.event.title, score: x.score, band: x.band, km: x.distanceKm })) }, Date.now() - t1);
    for (const x of exposures.filter((x) => x.score >= 55).slice(0, 10)) await publish("risk.alert", { subject: x.subject.name, subjectType: x.subject.type, subjectId: x.subject.id, destination: x.subject.destination, event: x.event.title, score: x.score, band: x.band }, x.subject.orgId);

    // ---------- PLAN ----------
    const t2 = Date.now();
    const orgIds = [...new Set(subjects.map((s) => s.orgId).filter(Boolean))] as string[];
    const orgs = await db.organization.findMany({ where: { id: { in: orgIds } }, include: { rules: { where: { enabled: true } }, _count: { select: { webhooks: true } } } });
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    const planned: { spec: TaskSpec; x: Exposure; level: string }[] = [];
    for (const x of exposures) {
      const org = x.subject.orgId ? orgMap.get(x.subject.orgId) : undefined;
      const level = org?.autonomyLevel ?? "L2";
      const specs = playbookFor(x);
      for (const r of org?.rules ?? []) {
        const conditions = safeJson(r.conditions, {});
        if (ruleMatches(conditions, x)) {
          specs.push(...tasksFromRule({ name: r.name, actions: safeJson(r.actions, []) }, x));
          await db.automationRule.update({ where: { id: r.id }, data: { runCount: { increment: 1 }, lastRunAt: now } });
        }
      }
      // collapse duplicate kinds per exposure (rule + playbook may both ask for the same thing)
      const seen = new Set<string>();
      if (!org?._count.webhooks) seen.add("webhook"); // no partner endpoints configured
      for (const spec of specs) { if (seen.has(spec.kind)) continue; seen.add(spec.kind); planned.push({ spec, x, level }); }
    }
    const max = opts.maxTasks ?? 150;
    const created: { id: string; decision: ReturnType<typeof decide>; kind: string }[] = [];
    for (const p of planned) {
      if (created.length >= max) break;
      const key = createHash("sha1").update(`${p.spec.kind}|${p.x.subject.type}|${p.x.subject.id}|${p.x.event.id}`).digest("hex").slice(0, 32);
      const exists = await db.agentTask.findUnique({ where: { idempotencyKey: key }, select: { id: true } });
      if (exists) continue;
      const decision = decide(p.spec.kind as TaskKind, p.level);
      const t = await db.agentTask.create({
        data: {
          runId: run.id, orgId: p.x.subject.orgId, subjectType: p.x.subject.type, subjectId: p.x.subject.id, newsEventId: p.x.event.id,
          kind: p.spec.kind, title: p.spec.title, detail: p.spec.detail, payload: JSON.stringify({ ...p.spec.payload, source: p.spec.source }),
          autonomyLevel: p.level, status: decision === "record" ? "recorded" : "proposed", idempotencyKey: key,
        },
      });
      created.push({ id: t.id, decision, kind: t.kind });
    }
    const byKind: Record<string, number> = {};
    for (const c of created) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
    await step("plan", `Planned ${created.length} new actions from playbooks and automation rules (${Object.entries(byKind).map(([k, v]) => `${v}× ${TASK_POLICY[k as TaskKind]?.label ?? k}`).join(", ") || "nothing new"}). Already-handled event/subject pairs were skipped (idempotent).`, "plan_actions", { exposures: exposures.length }, { byKind }, Date.now() - t2);

    // ---------- ACT ----------
    const t3 = Date.now();
    let executed = 0, proposed = 0;
    for (const c of created) {
      if (c.decision === "execute") { const r = await executeTask(c.id, "agent"); if (r.status === "executed") executed++; }
      else if (c.decision === "propose") proposed++;
    }
    await step("act", `Executed ${executed} actions automatically within policy; ${proposed} await human approval in the inbox.`, "execute_tasks", {}, { executed, proposed }, Date.now() - t3);

    // ---------- REFLECT ----------
    let summary = `Scanned ${ingest?.fetched ?? 0} news items, ${exposures.length} exposures, ${executed} actions executed, ${proposed} awaiting approval.`;
    if (exposures[0]) summary += ` Top risk: ${exposures[0].subject.name} in ${exposures[0].subject.destination} — ${exposures[0].event.title.replace(/^drill:\s*/i, "")} (${exposures[0].score}/100).`;
    if (useGen && exposures.length) {
      const g2 = await generate([{ role: "system", content: CHAKRA_SYSTEM_PROMPT }, { role: "user", content: `CONTEXT:\n${exposures.slice(0, 6).map((x) => `- ${x.subject.name} @ ${x.subject.destination}: ${x.event.title} (${x.score}/100)`).join("\n")}\nActions executed: ${executed}, awaiting approval: ${proposed}.\nWrite a 2-sentence operations briefing.` }], { maxTokens: 140, timeoutMs: 8000 });
      if (g2) summary = g2;
    }
    await step("reflect", summary, null, {}, { executed, proposed });
    await db.agentRun.update({ where: { id: run.id }, data: { status: "succeeded", summary, eventsSeen: events.length, actionsTaken: executed, finishedAt: new Date() } });
    await publish("agent.run", { runId: run.id, status: "succeeded", summary, executed, proposed }, opts.orgId ?? null);
    return { runId: run.id, ingest, exposures: exposures.length, tasksCreated: created.length, executed, proposed, summary, ms: Date.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.agentRun.update({ where: { id: run.id }, data: { status: "failed", summary: msg.slice(0, 500), finishedAt: new Date() } }).catch(() => {});
    await publish("agent.run", { runId: run.id, status: "failed", error: msg.slice(0, 300) }, opts.orgId ?? null).catch(() => null);
    throw e;
  }
}
