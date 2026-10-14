"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bot, Brain, CheckCircle2, ExternalLink, Inbox, MapPin, Newspaper, ShieldAlert, Users, X, Zap } from "lucide-react";
import { Btn, CategoryBadge, RiskMeter, SeverityBadge } from "@/components/gc/ui";
import { postJson, useEventStream } from "@/components/gc/hooks";
import { CATEGORY_META, type NewsCategory } from "@/lib/slm/labels";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { cn } from "@/lib/utils";

export interface IncidentResult {
  event: { id: string; title: string; category: string; severity: string; impactScore: number; placeName: string | null; lat: number | null; lng: number | null; radiusKm: number };
  run: { id: string; summary: string; executed: number; proposed: number; ms: number };
  exposed: { id: string; name: string; destination: string; score: number; distanceKm: number | null; status: string }[];
  tasks: { id: string; kind: string; title: string; status: string }[];
  checkins: { travelerId: string; token: string }[];
}

const PHASES = [
  { icon: Newspaper, label: "Detect", d: "Reading the incoming report", c: "#38bdf8" },
  { icon: Brain, label: "Understand", d: "Our AI classifies it and pins it on the map", c: "#a78bfa" },
  { icon: Users, label: "Match", d: "Checking every traveller and trip", c: "#fbbf24" },
  { icon: Zap, label: "Act", d: "Alerting, checking in and re-planning", c: "#ff6a1a" },
];
const KIND: Record<string, string> = {
  notify: "Alerts sent to travellers", advisory: "Safety advisories (English + Hindi)", escalate: "Escalated to your security team", webhook: "Partner systems notified",
  checkin: "“Are you safe?” check-ins sent", reroute: "Alternative routes prepared", reschedule: "Itinerary days re-planned", compensation_claim: "Compensation claims drafted", hold_rebooking: "Seat holds (need your approval)",
};
const clean = (t: string) => t.replace(/^drill:\s*/i, "");

/** "Simulate an incident" — inject a labelled drill and show, in plain language, what the agent did about it. */
export function IncidentSimulator({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: IncidentResult) => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [phase, setPhase] = useState(-1);
  const [res, setRes] = useState<IncidentResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout); }; }, []);
  useEffect(() => { if (!open) { timers.current.forEach(clearTimeout); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !running) onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, running, onClose]);

  useEventStream((e) => {
    if (e.type !== "checkin.update") return;
    const p = e.payload as { travelerId?: string; status?: string };
    if (p.travelerId && (p.status === "safe" || p.status === "needs_help")) setReplies((r) => ({ ...r, [p.travelerId!]: p.status! }));
  }, open);

  const run = useCallback(async (id: string) => {
    if (running) return;
    setRunning(id); setRes(null); setErr(null); setReplies({}); setPhase(0);
    timers.current.forEach(clearTimeout);
    timers.current = [setTimeout(() => setPhase(1), 500), setTimeout(() => setPhase(2), 1000)];
    try {
      const r = await postJson<IncidentResult>("/api/demo/inject", { scenario: id });
      if (!alive.current) return;
      timers.current.forEach(clearTimeout);
      setPhase(3);
      timers.current = [setTimeout(() => { if (alive.current) { setPhase(4); setRes(r); onDone(r); } }, 450)];
    } catch (e) {
      if (!alive.current) return;
      timers.current.forEach(clearTimeout);
      setPhase(-1);
      setErr((e as Error).message || "The simulation could not run. Please try again.");
    } finally {
      if (alive.current) setRunning(null);
    }
  }, [running, onDone]);

  const reset = () => { setRes(null); setPhase(-1); setErr(null); setReplies({}); };
  if (!open) return null;

  const grouped = res ? Object.entries(res.tasks.reduce<Record<string, { n: number; done: number }>>((a, t) => {
    const g = a[t.kind] ?? { n: 0, done: 0 }; g.n++; if (t.status === "executed") g.done++; a[t.kind] = g; return a;
  }, {})) : [];
  const awaiting = res ? res.tasks.filter((t) => t.status === "proposed").length : 0;
  const done = res ? res.tasks.filter((t) => t.status === "executed").length : 0;
  const firstCheckin = res?.checkins[0];
  const checkinPerson = firstCheckin ? res?.exposed.find((x) => x.id === firstCheckin.travelerId) : undefined;
  const catLabel = res ? (CATEGORY_META[res.event.category as NewsCategory]?.label ?? res.event.category).toLowerCase() : "";

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[rgba(5,8,15,.6)] backdrop-blur-sm" onClick={() => { if (!running) onClose(); }} />
      <div role="dialog" aria-modal="true" aria-label="Simulate an incident" className="relative w-full sm:max-w-[760px] max-h-[92vh] overflow-y-auto gc-scroll gc-panel rounded-b-none sm:rounded-3xl shadow-2xl gc-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b gc-line bg-[var(--gc-panel)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gc-brand)]">Simulation · safe drill</div>
            <h2 className="font-display text-xl font-semibold">{res ? "Here’s what just happened" : "Simulate an incident"}</h2>
          </div>
          <button onClick={onClose} disabled={!!running} className="h-9 w-9 grid place-items-center rounded-xl hover:bg-[var(--gc-panel-2)] disabled:opacity-40" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5">
          {!res && (
            <>
              <p className="gc-muted text-sm">Pick an event. It is added to the live feed as a clearly-labelled <b>drill</b>, and the agent handles it exactly as it would a real headline — no one touches anything.</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-4">
                {SCENARIOS.map((s) => (
                  <button key={s.id} disabled={!!running} onClick={() => run(s.id)} className={cn("text-left rounded-2xl border p-4 transition", running === s.id ? "border-[var(--gc-brand)] bg-[var(--gc-brand)]/10" : "gc-line hover:bg-[var(--gc-panel-2)] hover:-translate-y-0.5", running && running !== s.id && "opacity-40")}>
                    <div className="text-2xl" aria-hidden>{s.emoji}</div>
                    <div className="font-semibold text-sm mt-1.5">{s.label}</div>
                    <div className="text-xs gc-muted mt-1 line-clamp-2">{s.summary}</div>
                  </button>
                ))}
              </div>
              {phase >= 0 && (
                <ol className="mt-5 grid sm:grid-cols-4 gap-2" aria-label="Agent progress">
                  {PHASES.map((p, n) => (
                    <li key={p.label} className={cn("rounded-xl px-3 py-2.5 transition", n <= phase ? "gc-panel-2" : "opacity-35")}>
                      <div className="flex items-center gap-2">
                        <p.icon className="h-4 w-4" style={{ color: p.c }} />
                        <span className="text-sm font-semibold" style={{ color: n <= phase ? p.c : undefined }}>{p.label}</span>
                        {n < phase ? <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-500" /> : n === phase ? <span className="ml-auto h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
                      </div>
                      <div className="text-[11px] gc-muted mt-1">{p.d}</div>
                    </li>
                  ))}
                </ol>
              )}
              {err && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 text-red-500 text-sm px-3 py-2">{err}</p>}
            </>
          )}

          {res && (
            <div className="space-y-5">
              <div className="gc-panel-2 p-4">
                <div className="flex flex-wrap items-center gap-1.5"><CategoryBadge category={res.event.category} /><SeverityBadge severity={res.event.severity} /><span className="text-[11px] rounded-full px-2 py-0.5 bg-violet-500/15 text-violet-400 font-semibold">DRILL</span></div>
                <p className="font-medium mt-2 leading-snug">{clean(res.event.title)}</p>
              </div>

              <ol className="space-y-3">
                <Story icon={<Newspaper className="h-4 w-4" />} c="#38bdf8" title="Detected">A {catLabel} report{res.event.placeName ? <> near <b>{res.event.placeName}</b></> : null} arrived in the live feed.</Story>
                <Story icon={<Brain className="h-4 w-4" />} c="#a78bfa" title="Understood">Our in-house AI rated it <b>{res.event.severity}</b> severity with a travel-impact score of <b>{res.event.impactScore}/100</b>, affecting roughly {res.event.radiusKm} km around the location.</Story>
                <Story icon={<Users className="h-4 w-4" />} c="#fbbf24" title="Matched">{res.exposed.length === 0 ? "None of your travellers are close enough to be affected — so nobody was disturbed." : <><b>{res.exposed.length} traveller{res.exposed.length === 1 ? " is" : "s are"}</b> in the affected area right now.</>}</Story>
                <Story icon={<Zap className="h-4 w-4" />} c="#ff6a1a" title="Acted">{res.tasks.length === 0 ? "No action was needed." : <>The agent completed <b>{done} action{done === 1 ? "" : "s"}</b> on its own{awaiting ? <> and queued <b>{awaiting}</b> for your approval</> : null} — all in <b>{(res.run.ms / 1000).toFixed(1)} seconds</b>.</>}</Story>
              </ol>

              {res.exposed.length > 0 && (
                <div>
                  <div className="text-xs font-semibold gc-muted mb-2 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Travellers affected</div>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {res.exposed.slice(0, 6).map((t) => (
                      <li key={t.id} className="flex items-center gap-3 gc-panel-2 p-3">
                        <RiskMeter score={t.score} size={42} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{t.name}</div>
                          <div className="text-xs gc-muted truncate">{t.destination}{t.distanceKm != null ? ` · ${t.distanceKm} km away` : ""}</div>
                        </div>
                        {replies[t.id] && <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5", replies[t.id] === "safe" ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500")}>{replies[t.id] === "safe" ? "Safe ✓" : "Needs help"}</span>}
                      </li>
                    ))}
                  </ul>
                  {res.exposed.length > 6 && <p className="text-xs gc-muted mt-2">+{res.exposed.length - 6} more on the Duty of Care page.</p>}
                </div>
              )}

              {grouped.length > 0 && (
                <div>
                  <div className="text-xs font-semibold gc-muted mb-2 flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" />What the agent did</div>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {grouped.map(([k, v]) => (
                      <li key={k} className="flex items-center justify-between gap-2 gc-panel-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{KIND[k] ?? k}</span>
                        <span className={cn("text-xs font-semibold shrink-0", v.done ? "text-emerald-500" : "text-amber-500")}>{v.done ? `${v.done} done` : `${v.n} to approve`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {firstCheckin && (
                  <a href={`/checkin/${firstCheckin.token}`} target="_blank" rel="noreferrer">
                    <Btn variant="outline"><ExternalLink className="h-4 w-4" />See what {checkinPerson?.name.split(" ")[0] ?? "the traveller"} receives</Btn>
                  </a>
                )}
                {awaiting > 0 && <Link href="/agent" onClick={onClose}><Btn variant="agent"><Inbox className="h-4 w-4" />Review {awaiting} approval{awaiting === 1 ? "" : "s"}</Btn></Link>}
                <Btn variant="ghost" onClick={onClose}><MapPin className="h-4 w-4" />Show on the map</Btn>
                <Btn variant="ghost" onClick={reset}>Try another</Btn>
              </div>
              {firstCheckin && <p className="text-xs gc-muted -mt-2">Open the traveller’s page and tap “I’m safe” — their status updates here and on Mission Control instantly.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Story({ icon, c, title, children }: { icon: ReactNode; c: string; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full grid place-items-center" style={{ background: `${c}22`, color: c }}>{icon}</span>
      <div><div className="text-sm font-semibold" style={{ color: c }}>{title}</div><p className="text-sm leading-relaxed">{children}</p></div>
    </li>
  );
}
