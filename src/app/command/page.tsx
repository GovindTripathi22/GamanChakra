"use client";

import Link from "next/link";
import { attempt, toast } from "@/components/gc/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, CheckCircle2, Compass, Globe2, Inbox, Play, Radio, RefreshCw, ShieldAlert, Siren, Users, X } from "lucide-react";
import { Panel, Stat, Btn, CategoryBadge, SeverityBadge, ProvenanceBadge, PageHeader, Empty, timeAgo } from "@/components/gc/ui";
import { useApi, useEventStream, postJson, type StreamEvent } from "@/components/gc/hooks";
import { WorldMap, type MapEvent } from "@/components/gc/world-map";
import { ProductTour, type TourStep } from "@/components/gc/tour";
import { IncidentSimulator, type IncidentResult } from "@/components/gc/incident-simulator";
import { CATEGORY_META, NEWS_CATEGORIES, type NewsCategory } from "@/lib/slm/labels";
import { cn } from "@/lib/utils";

interface Overview {
  kpis: { events24: number; high24: number; travelers: number; exposedTravelers: number; needHelp: number; executed24: number; pending: number; sampleMode: boolean };
  events: (MapEvent & { url: string; source: string; publishedAt: string; provenance: string; countryCode: string | null })[];
  leaderboard: { name: string; countryCode: string; score: number; band: string; top: string | null; topCategory: string | null; lat: number; lng: number }[];
  lastRun: { id: string; startedAt: string; status: string; summary: string | null } | null;
  org: { name: string; autonomyLevel: string; plan: string; kind: string } | null;
}
interface Traveler { id: string; name: string; destinationCity: string; destLat: number; destLng: number; exposureScore: number; safetyStatus: string }
interface Task { id: string; kind: string; title: string; detail: string; status: string; createdAt: string; event: { title: string; severity: string } | null }

const LEVELS = [
  { id: "L0", name: "Observe" }, { id: "L1", name: "Notify" }, { id: "L2", name: "Propose" }, { id: "L3", name: "Act" }, { id: "L4", name: "Autopilot" },
];
const WELCOME_KEY = "gc.welcome.v1";
const TOUR: TourStep[] = [
  { target: "kpis", title: "Your situation at a glance", body: <>How many world events were picked up in the last 24 hours, how many of your travellers are near one, who has asked for help, and how much the agent has already handled for you.</> },
  { target: "map", title: "The live world risk map", body: <>Every dot is a real news report that our own AI has read, understood and placed on the map — bigger and redder means more disruptive for travel. Diamonds are your travellers. Drag to pan, scroll to zoom.</> },
  { target: "feed", title: "Every headline, already understood", body: <>Live news from public sources worldwide. Each item is tagged with what kind of event it is, how serious it is and a travel-impact score. Click one to fly the map there.</> },
  { target: "stream", title: "Watch the agent think", body: <>The agent runs on its own every few minutes: it <b>senses</b> news, <b>thinks</b> about who is affected, <b>plans</b> actions, <b>acts</b>, then <b>reflects</b>. Each step appears here live.</> },
  { target: "inbox", title: "You stay in control", body: <>Anything above the autonomy level you set waits here for one-click approval — for example, holding a new seat for a stranded traveller.</> },
  { target: "autonomy", title: "Choose how much it does on its own", body: <><b>L0</b> only watches · <b>L1</b> notifies · <b>L2</b> proposes actions · <b>L3</b> acts on routine steps · <b>L4</b> full autopilot. You can change this any time.</> },
  { target: "simulate", title: "See it handle an incident", body: <>Trigger a safe drill — an earthquake, fog, a strike — and watch the agent detect it, find affected travellers and act in seconds.</> },
  { target: "jarvis", title: "Or just ask", body: <>Chakra, the voice assistant, answers questions like “Who is affected right now?” or “Is Dubai safe this week?” — in English or Hindi.</> },
];
const PHASE_COLOR: Record<string, string> = { sense: "#38bdf8", think: "#a78bfa", plan: "#fbbf24", act: "#ff6a1a", reflect: "#34d399" };

export default function CommandCenter() {
  const ov = useApi<Overview>("/api/overview", { refreshMs: 30000 });
  const trav = useApi<{ travelers: Traveler[] }>("/api/travelers", { refreshMs: 60000 });
  const inbox = useApi<{ tasks: Task[] }>("/api/agent/tasks?status=proposed", { refreshMs: 45000 });
  const [log, setLog] = useState<{ id: string; phase: string; text: string; at: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [cat, setCat] = useState<string | null>(null);
  const [onlyHigh, setOnlyHigh] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [tour, setTour] = useState(false);
  const [sim, setSim] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const closeTour = useCallback(() => setTour(false), []);
  const closeSim = useCallback(() => setSim(false), []);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(WELCOME_KEY) === "1"; } catch { /* storage blocked: show the guide */ }
    setWelcome(!seen);
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") === "1") setTimeout(() => setTour(true), 600);
    if (q.get("simulate") === "1") setSim(true);
    if (q.has("tour") || q.has("simulate")) window.history.replaceState(null, "", window.location.pathname);
    const start = () => setTour(true);
    window.addEventListener("gc:tour", start);
    return () => window.removeEventListener("gc:tour", start);
  }, []);
  const dismissWelcome = () => { setWelcome(false); try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ } };

  const live = useEventStream((e: StreamEvent) => {
    const p = e.payload as Record<string, unknown>;
    if (e.type === "agent.step") setLog((l) => [{ id: e.id, phase: String(p.phase), text: String(p.thought), at: e.createdAt }, ...l].slice(0, 60));
    if (e.type === "agent.run" && p.status !== "running") { setRunning(false); ov.reload(); inbox.reload(); trav.reload(); }
    if (e.type === "agent.run" && p.status === "running") setLog((l) => [{ id: e.id, phase: "run", text: `Cycle started (${p.trigger})`, at: e.createdAt }, ...l]);
    if (e.type === "news.ingested") ov.reload();
    if (e.type === "risk.alert") setLog((l) => [{ id: e.id, phase: "alert", text: `⚠ ${p.subject} · ${p.destination}: ${String(p.event).replace(/^drill:\s*/i, "")} (${p.score}/100)`, at: e.createdAt }, ...l].slice(0, 60));
    if (e.type === "checkin.update") trav.reload();
  });

  const runAgent = async () => {
    if (running) return;
    setRunning(true);
    try { await postJson("/api/agent/run", {}); toast("Cycle complete", "success"); } catch (e) { toast((e as Error).message, "error"); setLog((l) => [{ id: String(Date.now()), phase: "alert", text: `Run failed: ${(e as Error).message}`, at: new Date().toISOString() }, ...l]); }
    finally { setRunning(false); ov.reload(); inbox.reload(); trav.reload(); }
  };
  const setAutonomy = async (lvl: string) => {
    const prev = level;
    setLevel(lvl);
    const ok = await attempt(() => postJson("/api/agent/autonomy", { level: lvl }), { success: `Autonomy set to ${lvl}` });
    if (ok === undefined) setLevel(prev);
  };
  const [deciding, setDeciding] = useState<Set<string>>(new Set());
  const onIncident = useCallback((r: IncidentResult) => {
    if (r.event.lat != null && r.event.lng != null) setFocus({ lat: r.event.lat, lng: r.event.lng });
    setLog((l) => [{ id: `sim-${r.run.id}`, phase: "alert", text: `Drill handled: ${r.event.title.replace(/^drill:\s*/i, "")} — ${r.exposed.length} exposed, ${r.tasks.length} actions`, at: new Date().toISOString() }, ...l].slice(0, 60));
    ov.reload(); inbox.reload(); trav.reload();
  }, [ov, inbox, trav]);
  const decide = async (id: string, decision: "approve" | "reject") => {
    if (deciding.has(id)) return;
    setDeciding((s) => new Set(s).add(id));
    await attempt(() => postJson(`/api/agent/tasks/${id}`, { decision }), { success: decision === "approve" ? "Approved and executed" : "Dismissed" });
    setDeciding((s) => { const n = new Set(s); n.delete(id); return n; });
    inbox.reload(); ov.reload();
  };

  const events = useMemo(() => (ov.data?.events ?? []).filter((e) => e.category !== "not_travel" && (!cat || e.category === cat) && (!onlyHigh || e.severity === "high" || e.severity === "critical")), [ov.data, cat, onlyHigh]);
  const points = (trav.data?.travelers ?? []).filter((t) => t.exposureScore > 0 || t.safetyStatus !== "unknown").map((t) => ({ id: t.id, label: `${t.name} · ${t.destinationCity}`, lat: t.destLat, lng: t.destLng, score: t.exposureScore, status: t.safetyStatus }));
  const k = ov.data?.kpis;
  const currentLevel = level ?? ov.data?.org?.autonomyLevel ?? "L2";

  return (
    <main className="mx-auto max-w-[1440px] px-4 md:px-6 py-6">
      <PageHeader
        eyebrow={ov.data?.org?.name ?? "Mission Control"}
        title={<span className="flex items-center gap-3">Mission Control <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", live ? "bg-emerald-500/12 text-emerald-500" : "bg-slate-500/15 gc-muted")}><Radio className="h-3 w-3" />{live ? "LIVE" : "CONNECTING"}</span></span>}
        description="Real-time world events, matched against every trip and traveller, with an autonomous agent acting inside your policy."
        actions={
          <>
            <div data-tour="autonomy" className="flex rounded-xl border gc-line p-0.5" role="radiogroup" aria-label="Agent autonomy level">
              {LEVELS.map((l) => (
                <button key={l.id} role="radio" aria-checked={currentLevel === l.id} onClick={() => setAutonomy(l.id)} title={l.name} className={cn("px-2.5 h-8 rounded-[10px] text-xs font-semibold transition", currentLevel === l.id ? "bg-[var(--gc-agent)] text-white" : "gc-muted hover:text-[var(--gc-text)]")}>
                  {l.id}<span className="hidden xl:inline font-normal"> {l.name}</span>
                </button>
              ))}
            </div>
            <Btn variant="agent" onClick={runAgent} loading={running} title="Run one full agent cycle on the latest news now"><Play className="h-4 w-4" />Run agent now</Btn>
            <Btn data-tour="simulate" onClick={() => setSim(true)}><Siren className="h-4 w-4" />Simulate incident</Btn>
          </>
        }
      />

      {welcome && (
        <section aria-label="Welcome" className="relative mb-4 rounded-3xl border border-[var(--gc-brand)]/25 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_srgb,var(--gc-brand)_14%,transparent),transparent_60%)] p-5 md:p-6 gc-fade-up">
          <button onClick={dismissWelcome} className="absolute right-3 top-3 h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel-2)]" aria-label="Dismiss welcome guide"><X className="h-4 w-4" /></button>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gc-brand)]">Welcome{ov.data?.org?.name ? ` · ${ov.data.org.name}` : ""}</div>
          <h2 className="font-display text-2xl md:text-[26px] font-semibold mt-1 pr-10">Voyage is your always-on travel safety agent.</h2>
          <p className="gc-muted mt-1 max-w-3xl">It reads world news around the clock, works out which of your travellers are affected, and takes care of them — automatically or with your approval. Here’s what it is doing right now:</p>
          <ol className="grid md:grid-cols-3 gap-3 mt-4">
            {[
              { n: 1, icon: <Globe2 className="h-4 w-4" />, t: "It watches the world", v: k ? `${k.events24} events` : "…", d: "read and understood in the last 24 hours, from free public news sources worldwide." },
              { n: 2, icon: <Users className="h-4 w-4" />, t: "It knows who’s affected", v: k ? `${k.exposedTravelers} of ${k.travelers}` : "…", d: "of your travellers are near an active risk right now." },
              { n: 3, icon: <Bot className="h-4 w-4" />, t: "It acts for you", v: k ? `${k.executed24} actions` : "…", d: k ? `taken automatically today${k.pending ? ` · ${k.pending} waiting for your OK` : ""}.` : "taken automatically today." },
            ].map((c) => (
              <li key={c.n} className="gc-panel p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-6 w-6 rounded-full grid place-items-center bg-[var(--gc-brand)]/15 text-[var(--gc-brand)] text-xs">{c.n}</span>{c.t}</div>
                <div className="font-display text-2xl font-semibold mt-2 tabular-nums">{c.v}</div>
                <p className="text-xs gc-muted mt-0.5">{c.d}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 mt-4">
            <Btn onClick={() => setSim(true)}><Siren className="h-4 w-4" />Simulate an incident</Btn>
            <Btn variant="outline" onClick={() => setTour(true)}><Compass className="h-4 w-4" />Take the 60-second tour</Btn>
            <Btn variant="ghost" onClick={dismissWelcome}>Got it</Btn>
          </div>
        </section>
      )}

      {k?.sampleMode && (
        <div className="mb-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm flex gap-3 items-start">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-violet-400 shrink-0" />
          <span><b>Drill mode.</b> Live news sources were unreachable from this server, so the agent is running on a clearly-labelled simulation feed. Connect the server to the internet (no API keys needed) and the next cycle switches to live GDELT, USGS, GDACS, Google News and RSS automatically.</span>
        </div>
      )}

      <div data-tour="kpis" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Stat label="Live events · 24h" value={k?.events24 ?? "–"} icon={<Globe2 className="h-4 w-4" />} hint="classified by Chakra-Nano" />
        <Stat label="High / critical" value={k?.high24 ?? "–"} tone="crit" icon={<ShieldAlert className="h-4 w-4" />} hint="severity ≥ high" />
        <Stat label="Travellers exposed" value={k ? `${k.exposedTravelers}/${k.travelers}` : "–"} tone="warn" icon={<Users className="h-4 w-4" />} hint="exposure ≥ 35" />
        <Stat label="Need help" value={k?.needHelp ?? "–"} tone={k?.needHelp ? "crit" : "safe"} icon={<AlertTriangle className="h-4 w-4" />} hint="from check-ins" />
        <Stat label="Actions · 24h" value={k?.executed24 ?? "–"} tone="agent" icon={<Bot className="h-4 w-4" />} hint="executed autonomously" />
        <Stat label="Awaiting approval" value={k?.pending ?? "–"} tone="brand" icon={<Inbox className="h-4 w-4" />} hint={<Link href="/agent" className="hover:underline">open inbox →</Link>} />
      </div>

      <div className="grid xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <div data-tour="map"><Panel pad={false} title="Live world risk map" subtitle={`${events.length} travel-relevant events (72h) · ◆ travellers`} action={
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs gc-muted"><input type="checkbox" checked={onlyHigh} onChange={(e) => setOnlyHigh(e.target.checked)} className="accent-[var(--gc-brand)]" />High+ only</label>
              <button onClick={() => ov.reload()} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel-2)]" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
            </div>
          }>
            <WorldMap events={events} points={points} height={440} focus={focus} />
            <div className="flex flex-wrap gap-1.5 px-4 py-3 border-t gc-line">
              <button onClick={() => setCat(null)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium border", !cat ? "border-[var(--gc-brand)] text-[var(--gc-brand)]" : "gc-line gc-muted")}>All</button>
              {NEWS_CATEGORIES.filter((c) => c !== "not_travel").map((c) => (
                <button key={c} onClick={() => setCat(cat === c ? null : c)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium border inline-flex items-center gap-1.5", cat === c ? "border-current" : "gc-line gc-muted")} style={cat === c ? { color: CATEGORY_META[c as NewsCategory].color } : undefined}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_META[c as NewsCategory].color }} />{CATEGORY_META[c as NewsCategory].label}
                </button>
              ))}
            </div>
          </Panel></div>

          <div data-tour="feed"><Panel pad={false} title="Real-time feed" subtitle="Every headline classified, geotagged and scored for travel impact" action={<Link href="/risk" className="text-xs text-[var(--gc-brand)] font-medium">Risk Radar →</Link>}>
            <ul className="divide-y divide-[var(--gc-line)] max-h-[520px] overflow-y-auto gc-scroll">
              {events.slice(0, 60).map((e) => (
                <li key={e.id} className="px-4 py-3 hover:bg-[var(--gc-panel-2)] cursor-pointer" onClick={() => e.lat != null && setFocus({ lat: e.lat, lng: e.lng! })}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-10 shrink-0 text-center">
                      <div className="font-display text-lg font-semibold tabular-nums leading-none" style={{ color: e.impactScore >= 55 ? "var(--gc-crit)" : e.impactScore >= 35 ? "var(--gc-warn)" : "var(--gc-muted)" }}>{e.impactScore}</div>
                      <div className="text-[9px] gc-muted uppercase tracking-wider mt-0.5">impact</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <a href={e.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-[14px] font-medium leading-snug hover:underline">{e.title}</a>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <CategoryBadge category={e.category} /><SeverityBadge severity={e.severity} /><ProvenanceBadge provenance={e.provenance} />
                        <span className="text-[11px] gc-muted">{e.placeName ?? "—"} · {e.source} · {timeAgo(e.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!ov.loading && events.length === 0 && <Empty icon={<Globe2 className="h-6 w-6" />} title="No events yet">Run the agent to pull the latest world news.</Empty>}
            </ul>
          </Panel></div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div data-tour="stream"><Panel pad={false} title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[var(--gc-agent)]" />Agent thought stream</span>} subtitle={ov.data?.lastRun ? `Last cycle ${timeAgo(ov.data.lastRun.startedAt)} · ${ov.data.lastRun.status}` : "Waiting for first cycle"}>
            <ol className="max-h-[360px] overflow-y-auto gc-scroll px-4 py-3 space-y-3">
              {log.length === 0 && ov.data?.lastRun?.summary && <li className="text-sm gc-muted">{ov.data.lastRun.summary}</li>}
              {log.length === 0 && !ov.data?.lastRun && <li className="text-sm gc-muted">Press “Run agent now” or wait for the autonomous schedule.</li>}
              {log.map((l) => (
                <li key={l.id} className="flex gap-3 gc-fade-up">
                  <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: PHASE_COLOR[l.phase] ?? (l.phase === "alert" ? "var(--gc-crit)" : "var(--gc-muted)") }} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: PHASE_COLOR[l.phase] ?? undefined }}>{l.phase} · {timeAgo(l.at)}</div>
                    <p className="text-[13px] leading-snug">{l.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel></div>

          <div data-tour="inbox"><Panel pad={false} title="Approvals inbox" subtitle="Actions above your autonomy level wait here" action={<Link href="/agent" className="text-xs text-[var(--gc-brand)] font-medium">All →</Link>}>
            <ul className="divide-y divide-[var(--gc-line)] max-h-[300px] overflow-y-auto gc-scroll">
              {(inbox.data?.tasks ?? []).slice(0, 8).map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="text-[13px] font-medium leading-snug">{t.title}</div>
                  <div className="text-[11px] gc-muted mt-0.5 line-clamp-1">{t.event?.title?.replace(/^drill:\s*/i, "") ?? t.detail}</div>
                  <div className="flex gap-2 mt-2">
                    <Btn size="sm" variant="agent" loading={deciding.has(t.id)} onClick={() => decide(t.id, "approve")}><CheckCircle2 className="h-3.5 w-3.5" />Approve</Btn>
                    <Btn size="sm" variant="ghost" disabled={deciding.has(t.id)} onClick={() => decide(t.id, "reject")}>Dismiss</Btn>
                  </div>
                </li>
              ))}
              {(inbox.data?.tasks ?? []).length === 0 && <Empty icon={<Inbox className="h-5 w-5" />} title="Inbox zero">Nothing needs your approval.</Empty>}
            </ul>
          </Panel></div>

          <Panel pad={false} title="Destination risk leaderboard" subtitle="Live index from news within each city's radius">
            <ol className="divide-y divide-[var(--gc-line)]">
              {(ov.data?.leaderboard ?? []).map((c, i) => (
                <li key={c.name} className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[var(--gc-panel-2)]" onClick={() => setFocus({ lat: c.lat, lng: c.lng })}>
                  <span className="w-5 text-xs gc-muted tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{c.name} <span className="gc-muted text-xs">{c.countryCode}</span></div>
                    <div className="text-[11px] gc-muted truncate">{c.top?.replace(/^drill:\s*/i, "")}</div>
                  </div>
                  <div className="w-20">
                    <div className="h-1.5 rounded-full bg-[var(--gc-panel-2)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score >= 55 ? "var(--gc-crit)" : c.score >= 35 ? "var(--gc-warn)" : "var(--gc-safe)" }} /></div>
                    <div className="text-[11px] text-right tabular-nums mt-0.5">{c.score}</div>
                  </div>
                </li>
              ))}
              {(ov.data?.leaderboard ?? []).length === 0 && <Empty title="All clear">No elevated destinations right now.</Empty>}
            </ol>
          </Panel>
        </div>
      </div>
      <IncidentSimulator open={sim} onClose={closeSim} onDone={onIncident} />
      <ProductTour steps={TOUR} open={tour} onClose={closeTour} />
    </main>
  );
}
