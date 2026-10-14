"use client";

import { Suspense, useEffect, useState } from "react";
import { attempt } from "@/components/gc/toast";
import { SafeBoundary } from "@/components/gc/error-boundary";
import { useSearchParams } from "next/navigation";
import { Bot, CheckCircle2, ChevronDown, Play, XCircle, ExternalLink } from "lucide-react";
import { Panel, Btn, PageHeader, Empty, timeAgo, SeverityBadge } from "@/components/gc/ui";
import { useApi, useEventStream, postJson } from "@/components/gc/hooks";
import { cn } from "@/lib/utils";

interface Run { id: string; trigger: string; status: string; summary: string | null; startedAt: string; finishedAt: string | null; eventsSeen: number; actionsTaken: number; model: string }
interface Step { id: string; idx: number; phase: string; thought: string; tool: string | null; output: unknown; durationMs: number }
interface Task { id: string; kind: string; title: string; detail: string; status: string; autonomyLevel: string; createdAt: string; decidedBy: string | null; result: Record<string, unknown> | null; payload: Record<string, unknown>; event: { title: string; severity: string; url: string; provenance: string } | null }

const PHASES: Record<string, { c: string; l: string }> = { sense: { c: "#38bdf8", l: "Sense" }, think: { c: "#a78bfa", l: "Think" }, plan: { c: "#fbbf24", l: "Plan" }, act: { c: "#ff6a1a", l: "Act" }, reflect: { c: "#34d399", l: "Reflect" } };
const KIND: Record<string, string> = { notify: "Notify", advisory: "Advisory", escalate: "Escalation", webhook: "Webhook", checkin: "Safety check-in", reroute: "Re-route", reschedule: "Re-schedule", compensation_claim: "Compensation", hold_rebooking: "Seat hold" };

function AgentInner() {
  const params = useSearchParams();
  const runs = useApi<{ runs: Run[] }>("/api/agent/runs", { refreshMs: 30000 });
  const [runId, setRunId] = useState<string | null>(params.get("run"));
  const detail = useApi<{ run: Run & { steps: Step[] } }>(runId ? `/api/agent/runs/${runId}` : null);
  const [tab, setTab] = useState<"proposed" | "executed" | "rejected">("proposed");
  const tasks = useApi<{ tasks: Task[] }>(`/api/agent/tasks?status=${tab}`, { refreshMs: 30000 });
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (!runId && runs.data?.runs[0]) setRunId(runs.data.runs[0].id); }, [runs.data, runId]);
  useEventStream((e) => { if (e.type === "agent.run" || e.type === "agent.task") { runs.reload(); tasks.reload(); if (runId) detail.reload(); } });

  const [deciding, setDeciding] = useState<Set<string>>(new Set());
  const run = async () => {
    if (running) return;
    setRunning(true);
    const r = await attempt(() => postJson<{ runId: string }>("/api/agent/run", {}), { success: "Cycle complete" });
    if (r?.runId) setRunId(r.runId);
    setRunning(false); runs.reload(); tasks.reload();
  };
  const decide = async (id: string, decision: "approve" | "reject") => {
    if (deciding.has(id)) return;
    setDeciding((s) => new Set(s).add(id));
    await attempt(() => postJson(`/api/agent/tasks/${id}`, { decision }), { success: decision === "approve" ? "Approved and executed" : "Rejected" });
    setDeciding((s) => { const n = new Set(s); n.delete(id); return n; });
    tasks.reload();
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 md:px-6 py-6">
      <PageHeader eyebrow="Autonomous agent" title="Every decision, explained." description="Each cycle senses live news, thinks about exposure, plans with playbooks + your automation rules, acts within your autonomy level, and reflects. Nothing is hidden." actions={<Btn variant="agent" onClick={run} loading={running}><Play className="h-4 w-4" />Run a cycle</Btn>} />
      <div className="grid xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-3" pad={false} title="Cycles" subtitle="schedule · manual · voice">
          <ul className="max-h-[680px] overflow-y-auto gc-scroll divide-y divide-[var(--gc-line)]">
            {(runs.data?.runs ?? []).map((r) => (
              <li key={r.id}>
                <button onClick={() => setRunId(r.id)} className={cn("w-full text-left px-4 py-3 hover:bg-[var(--gc-panel-2)]", runId === r.id && "bg-[var(--gc-panel-2)]")}>
                  <div className="flex items-center justify-between text-xs"><span className="capitalize font-semibold">{r.trigger}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", r.status === "succeeded" ? "bg-emerald-500/12 text-emerald-500" : r.status === "failed" ? "bg-red-500/12 text-red-500" : "bg-violet-500/12 text-violet-400")}>{r.status}</span></div>
                  <div className="text-[11px] gc-muted mt-1">{timeAgo(r.startedAt)} · {r.actionsTaken} actions · {r.eventsSeen} events</div>
                </button>
              </li>
            ))}
            {(runs.data?.runs ?? []).length === 0 && <Empty icon={<Bot className="h-6 w-6" />} title="No cycles yet">Run one now — it takes a few seconds.</Empty>}
          </ul>
        </Panel>

        <Panel className="xl:col-span-5" title="Reasoning trace" subtitle={detail.data ? `${detail.data.run.model} · ${detail.data.run.finishedAt ? `${Math.round((new Date(detail.data.run.finishedAt).getTime() - new Date(detail.data.run.startedAt).getTime()) / 100) / 10}s` : "running"}` : "Select a cycle"}>
          {detail.data && (
            <ol className="relative border-l gc-line ml-2 space-y-5">
              {detail.data.run.steps.map((s) => (
                <li key={s.id} className="pl-5 relative">
                  <span className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-[var(--gc-panel)]" style={{ background: PHASES[s.phase]?.c }} />
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PHASES[s.phase]?.c }}>{PHASES[s.phase]?.l ?? s.phase}{s.tool && <span className="gc-muted normal-case font-mono tracking-normal"> · {s.tool}()</span>}<span className="gc-muted normal-case tracking-normal font-normal"> · {s.durationMs} ms</span></div>
                  <p className="text-[14px] leading-relaxed mt-1">{s.thought}</p>
                  {s.output != null && Object.keys(s.output as object).length > 0 && (
                    <details className="mt-1.5">
                      <summary className="text-xs gc-muted cursor-pointer">tool output</summary>
                      <pre className="mt-1 max-h-56 overflow-auto gc-scroll rounded-lg gc-panel-2 p-2 text-[11px] font-mono whitespace-pre-wrap">{JSON.stringify(s.output, null, 2)}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
          {!detail.data && <Empty title="Pick a cycle to see how the agent reasoned." />}
        </Panel>

        <Panel className="xl:col-span-4" pad={false} title="Actions" action={
          <div className="flex rounded-lg border gc-line p-0.5 text-xs">
            {(["proposed", "executed", "rejected"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("px-2.5 h-7 rounded-md capitalize", tab === t ? "bg-[var(--gc-panel-2)] font-semibold" : "gc-muted")}>{t === "proposed" ? "Inbox" : t}</button>)}
          </div>
        }>
          <ul className="max-h-[680px] overflow-y-auto gc-scroll divide-y divide-[var(--gc-line)]">
            {(tasks.data?.tasks ?? []).map((t) => (
              <li key={t.id} className="px-4 py-3">
                <button className="w-full text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <div className="flex items-center gap-2"><span className="rounded-md bg-[var(--gc-panel-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{KIND[t.kind] ?? t.kind}</span>{t.event && <SeverityBadge severity={t.event.severity} />}<span className="ml-auto text-[11px] gc-muted">{timeAgo(t.createdAt)}</span><ChevronDown className={cn("h-3.5 w-3.5 gc-muted transition", open === t.id && "rotate-180")} /></div>
                  <div className="text-[13px] font-medium mt-1 leading-snug">{t.title}</div>
                </button>
                {open === t.id && <SafeBoundary label="Task details" minHeight={60}><TaskDetail t={t} /></SafeBoundary>}
                {t.status === "proposed" && (
                  <div className="flex gap-2 mt-2">
                    <Btn size="sm" variant="agent" loading={deciding.has(t.id)} onClick={() => decide(t.id, "approve")}><CheckCircle2 className="h-3.5 w-3.5" />Approve & run</Btn>
                    <Btn size="sm" variant="ghost" disabled={deciding.has(t.id)} onClick={() => decide(t.id, "reject")}><XCircle className="h-3.5 w-3.5" />Reject</Btn>
                  </div>
                )}
              </li>
            ))}
            {(tasks.data?.tasks ?? []).length === 0 && <Empty title={tab === "proposed" ? "Inbox zero" : "Nothing here yet"} />}
          </ul>
        </Panel>
      </div>
    </main>
  );
}

function TaskDetail({ t }: { t: Task }) {
  const r = t.result as Record<string, any> | null;
  return (
    <div className="mt-2 space-y-2 text-[13px]">
      <p className="gc-muted">{t.detail}</p>
      {t.event && <a href={t.event.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--gc-brand)]">Source event <ExternalLink className="h-3 w-3" /></a>}
      {r?.advisory?.en && <div className="gc-panel-2 p-2.5"><div className="font-medium text-xs">{r.advisory.en.headline}</div><p className="text-xs mt-1">{r.advisory.en.body}</p>{r.advisory.hi && <p className="text-xs mt-1.5 gc-muted">{r.advisory.hi.body}</p>}</div>}
      {r?.link && <div className="gc-panel-2 p-2.5 text-xs break-all">Check-in link: <a className="text-[var(--gc-brand)]" href={r.link} target="_blank" rel="noreferrer">{r.link}</a>{r.whatsappLink && <> · <a className="text-emerald-500" href={r.whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a></>}</div>}
      {Array.isArray(r?.options) && <ul className="gc-panel-2 p-2.5 text-xs space-y-1">{r!.options.slice(0, 4).map((o: any) => <li key={o.id} className="flex justify-between gap-2"><span className="capitalize">{o.mode} · {o.durationHours}h</span><span>₹{o.costInr[0].toLocaleString("en-IN")}–{o.costInr[1].toLocaleString("en-IN")}</span></li>)}</ul>}
      {r?.sandboxHold && <div className="gc-panel-2 p-2.5 text-xs">Sandbox hold <b>{r.sandboxHold.ref}</b> · expires {timeAgo(r.sandboxHold.expiresAt)}</div>}
      {r?.estimate && <div className="gc-panel-2 p-2.5 text-xs"><b>{r.estimate.regime}</b> · {r.estimate.eligible ? `eligible${r.estimate.amount ? ` · ${r.estimate.currency} ${r.estimate.amount}` : ""}` : "no cash compensation"}<details className="mt-1"><summary className="cursor-pointer gc-muted">Claim letter</summary><pre className="whitespace-pre-wrap font-mono text-[11px] mt-1">{r.estimate.letter}</pre></details></div>}
      {r?.flaggedItems && <div className="gc-panel-2 p-2.5 text-xs">{r.suggestion}<ul className="list-disc pl-4 mt-1">{r.flaggedItems.map((i: any) => <li key={i.id}>{i.title}</li>)}</ul></div>}
      {r?.error && <div className="text-xs text-red-500">Error: {r.error}</div>}
      <div className="text-[10px] gc-muted">autonomy {t.autonomyLevel} · {String(t.payload?.source ?? "")}{t.decidedBy ? ` · decided by ${t.decidedBy === "agent" ? "agent" : "human"}` : ""}</div>
    </div>
  );
}

export default function AgentPage() {
  return <Suspense><AgentInner /></Suspense>;
}
