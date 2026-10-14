"use client";

import { useEffect, useState } from "react";
import { attempt, toast } from "@/components/gc/toast";
import { Cpu, Search, Radar } from "lucide-react";
import { Panel, Btn, PageHeader, RiskMeter, CategoryBadge, SeverityBadge, ProvenanceBadge, Empty, timeAgo } from "@/components/gc/ui";
import { useApi, postJson } from "@/components/gc/hooks";
import { WorldMap } from "@/components/gc/world-map";
import { cn } from "@/lib/utils";

interface Risk { place: { name: string; countryCode: string; lat: number; lng: number } | null; score: number; band: string; drivers: { id: string; title: string; category: string; severity: string; distanceKm: number; contribution: number; url: string; source: string; publishedAt: string; provenance: string }[]; advice: string[]; computedAt: string }
const QUICK = ["Delhi", "Mumbai", "Goa", "Bengaluru", "Dubai", "Bangkok", "Singapore", "Kathmandu", "Paris", "London", "Tokyo", "Bali"];

export default function RiskRadar() {
  const [q, setQ] = useState("Dubai");
  const [risk, setRisk] = useState<Risk | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const board = useApi<{ cities: { name: string; countryCode: string; lat: number; lng: number; score: number; top: string | null }[] }>("/api/risk/leaderboard?limit=15", { refreshMs: 60000 });

  const check = async (raw: string) => {
    const place = raw.trim().slice(0, 80);
    if (!place) { setErr("Type a city, country or airport code."); return; }
    setBusy(true); setErr(null); setQ(place);
    try {
      const r = await fetch(`/api/risk?place=${encodeURIComponent(place)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 404 ? `We don't know “${place}” yet — try the nearest major city.` : j.error ?? "Couldn't compute the risk right now.");
      setRisk(j);
    } catch (e) { const m = (e as Error).message; setErr(/failed to fetch/i.test(m) ? "Network unavailable — try again." : m); setRisk(null); } finally { setBusy(false); }
  };
  useEffect(() => { check("Dubai"); }, []);

  return (
    <main className="mx-auto max-w-[1280px] px-4 md:px-6 py-6">
      <PageHeader eyebrow="Risk Radar · public" title="How risky is your destination — right now?" description="A live 0–100 index built from real-time world news within each city's impact radius, weighted by severity, recency and source reliability. Free for everyone." />
      <form onSubmit={(e) => { e.preventDefault(); check(q); }} className="flex gap-2 mb-3">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 gc-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Any city, country or airport code (e.g. Kochi, Thailand, LHR)" className="w-full h-12 rounded-2xl gc-panel pl-10 pr-4 outline-none focus:ring-2 focus:ring-[var(--gc-brand)]/40" aria-label="Destination" /></div>
        <Btn size="lg" type="submit" loading={busy}><Radar className="h-4 w-4" />Check</Btn>
      </form>
      <div className="flex flex-wrap gap-1.5 mb-6">{QUICK.map((c) => <button key={c} onClick={() => check(c)} className={cn("rounded-full border px-3 py-1 text-xs", q === c ? "border-[var(--gc-brand)] text-[var(--gc-brand)]" : "gc-line gc-muted hover:text-[var(--gc-text)]")}>{c}</button>)}</div>
      {err && <p className="text-red-500 mb-4">{err}</p>}

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          {risk?.place && (
            <Panel>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <RiskMeter score={risk.score} size={128} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-3xl font-semibold">{risk.place.name} <span className="gc-muted text-lg">{risk.place.countryCode}</span></div>
                  <div className="text-sm mt-1"><b className="capitalize">{risk.band}</b> <span className="gc-muted">risk · computed {timeAgo(risk.computedAt)} from {risk.drivers.length} signal{risk.drivers.length === 1 ? "" : "s"}</span></div>
                  <ul className="mt-3 space-y-1.5 text-sm">{risk.advice.length ? risk.advice.map((a) => <li key={a} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--gc-brand)] shrink-0" />{a}</li>) : <li className="gc-muted">No elevated risk signals in the last 96 hours. Enjoy the trip — Voyage keeps watching.</li>}</ul>
                </div>
              </div>
            </Panel>
          )}
          <Panel pad={false} title="What's driving the score" subtitle="Each signal's contribution after distance and time decay">
            <ul className="divide-y divide-[var(--gc-line)]">
              {(risk?.drivers ?? []).map((d) => (
                <li key={d.id} className="px-4 py-3 flex gap-3">
                  <div className="w-12 shrink-0 text-center"><div className="font-display text-lg font-semibold tabular-nums">+{d.contribution}</div><div className="text-[9px] gc-muted uppercase">points</div></div>
                  <div className="min-w-0">
                    <a href={d.url} target="_blank" rel="noreferrer" className="font-medium hover:underline leading-snug">{d.title}</a>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1"><CategoryBadge category={d.category} /><SeverityBadge severity={d.severity} /><ProvenanceBadge provenance={d.provenance} /><span className="text-[11px] gc-muted">{d.distanceKm < 9999 ? `${d.distanceKm} km away` : "country-wide"} · {d.source} · {timeAgo(d.publishedAt)}</span></div>
                  </div>
                </li>
              ))}
              {risk && risk.drivers.length === 0 && <Empty title="No active risk drivers" />}
            </ul>
          </Panel>
          <SlmPlayground />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Panel pad={false} title="Map">
            <WorldMap height={260} events={(risk?.drivers ?? []).map((d) => ({ ...d, impactScore: d.contribution, lat: null, lng: null }))} points={board.data?.cities.map((c) => ({ id: c.name, label: c.name, lat: c.lat, lng: c.lng, score: c.score })) ?? []} focus={risk?.place ? { lat: risk.place.lat, lng: risk.place.lng } : null} />
          </Panel>
          <Panel pad={false} title="Most at-risk destinations" subtitle="Updated every agent cycle">
            <ol className="divide-y divide-[var(--gc-line)]">
              {(board.data?.cities ?? []).map((c, i) => (
                <li key={c.name}><button onClick={() => check(c.name)} className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--gc-panel-2)]"><span className="text-xs gc-muted w-4">{i + 1}</span><span className="flex-1 min-w-0"><span className="text-sm font-medium">{c.name}</span><span className="block text-[11px] gc-muted truncate">{c.top}</span></span><span className="font-display font-semibold tabular-nums" style={{ color: c.score >= 55 ? "var(--gc-crit)" : c.score >= 35 ? "var(--gc-warn)" : "var(--gc-safe)" }}>{c.score}</span></button></li>
              ))}
              {(board.data?.cities ?? []).length === 0 && <Empty title="All clear worldwide" />}
            </ol>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function SlmPlayground() {
  const [text, setText] = useState("IndiGo cancels 120 flights at Delhi airport as dense fog cuts visibility to zero");
  const [out, setOut] = useState<null | { output: { category: string; categoryConfidence: number; severity: string; primaryPlace: { name: string; countryName: string } | null; evidence: string[]; latencyMs: number; categoryProbs: Record<string, number> } }>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!text.trim()) { toast("Paste a headline first", "info"); return; }
    setBusy(true);
    const r = await attempt(() => postJson<NonNullable<typeof out>>("/api/slm", { text: text.slice(0, 1000), task: "news" }));
    if (r) setOut(r);
    setBusy(false);
  };
  return (
    <Panel title={<span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-[var(--gc-agent)]" />Chakra-Nano playground</span>} subtitle="Our in-house small language model — trained from scratch, runs on CPU, no external AI">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-xl gc-panel-2 p-3 text-sm outline-none" aria-label="Headline to classify" />
      <div className="flex items-center gap-3 mt-2"><Btn variant="agent" size="sm" onClick={run} loading={busy}>Classify headline</Btn><span className="text-xs gc-muted">Try a headline from today’s paper.</span></div>
      {out && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
          <div className="gc-panel-2 p-3 space-y-1.5">
            <div className="flex items-center gap-2"><CategoryBadge category={out.output.category} /><SeverityBadge severity={out.output.severity} /></div>
            <div className="text-xs gc-muted">confidence {(out.output.categoryConfidence * 100).toFixed(1)}% · {out.output.latencyMs} ms</div>
            <div className="text-xs">Location: <b>{out.output.primaryPlace ? `${out.output.primaryPlace.name}, ${out.output.primaryPlace.countryName}` : "not detected"}</b></div>
            <ul className="text-[11px] gc-muted list-disc pl-4">{out.output.evidence.slice(0, 4).map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
          <div className="gc-panel-2 p-3">
            <div className="text-[11px] gc-muted mb-1.5">Class probabilities</div>
            {Object.entries(out.output.categoryProbs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[11px] mb-1"><span className="w-32 truncate">{k.replace(/_/g, " ")}</span><div className="flex-1 h-1.5 rounded-full bg-[var(--gc-panel)] overflow-hidden"><div className="h-full bg-[var(--gc-agent)]" style={{ width: `${v * 100}%` }} /></div><span className="w-10 text-right tabular-nums">{(v * 100).toFixed(0)}%</span></div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
