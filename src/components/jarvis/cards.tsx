"use client";

import Link from "next/link";
import { ExternalLink, Volume2 } from "lucide-react";
import { CategoryBadge, ProvenanceBadge, RiskMeter, SeverityBadge, timeAgo } from "@/components/gc/ui";
import type { Card } from "@/lib/jarvis/brain";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function JarvisCard({ card, onSpeak }: { card: Card; onSpeak?: (text: string, voice?: string) => void }) {
  const box = "gc-panel-2 p-3 text-[13px]";
  switch (card.type) {
    case "risk":
      return (
        <div className={box}>
          <div className="flex items-center gap-3">
            <RiskMeter score={card.score} size={56} />
            <div>
              <div className="font-display font-semibold">{card.place}</div>
              <div className="gc-muted text-xs capitalize">{card.band} risk · live news index</div>
            </div>
          </div>
          {card.drivers.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {card.drivers.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--gc-brand)] shrink-0" />
                  <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline leading-snug">{d.title.replace(/^drill:\s*/i, "")}<span className="gc-muted"> · {d.distanceKm < 9999 ? `${d.distanceKm} km` : "country-wide"}</span></a>
                </li>
              ))}
            </ul>
          )}
          {card.advice[0] && <p className="mt-2 text-xs gc-muted">{card.advice[0]}</p>}
        </div>
      );
    case "news":
      return (
        <div className={box}>
          <div className="font-medium mb-2">{card.title}</div>
          <ul className="space-y-2">
            {card.items.map((n) => (
              <li key={n.id}>
                <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline leading-snug block">{n.title.replace(/^drill:\s*/i, "")}</a>
                <div className="flex flex-wrap items-center gap-1.5 mt-1"><CategoryBadge category={n.category} /><SeverityBadge severity={n.severity} /><ProvenanceBadge provenance={n.provenance} /><span className="gc-muted text-[11px]">{timeAgo(n.publishedAt)}</span></div>
              </li>
            ))}
            {card.items.length === 0 && <li className="gc-muted">No relevant events.</li>}
          </ul>
        </div>
      );
    case "weather":
      return (
        <div className={box}>
          <div className="flex items-baseline justify-between"><span className="font-display font-semibold">{card.place}</span><span className="gc-muted text-[11px]">{card.source}</span></div>
          <div className="font-display text-3xl font-semibold mt-1">{card.tempC}°C</div>
          <div className="gc-muted">{card.condition} · {card.rainChance}% rain</div>
          <p className="mt-1.5 text-xs">{card.advisory}</p>
        </div>
      );
    case "routes":
      return (
        <div className={box}>
          <div className="font-medium mb-2">Alternatives {card.from ? `${card.from} → ` : "→ "}{card.to}</div>
          <ul className="space-y-1.5">
            {card.options.map((o, i) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0"><span className="font-medium capitalize">{i === 0 ? "★ " : ""}{o.mode}</span> <span className="gc-muted">{o.durationHours} h · {inr(o.costInr[0])}–{inr(o.costInr[1])}</span></span>
                {o.bookingUrl ? <a href={o.bookingUrl} target="_blank" rel="noreferrer" className="shrink-0 text-[var(--gc-brand)] text-xs inline-flex items-center gap-1">Book <ExternalLink className="h-3 w-3" /></a> : <span className="text-xs gc-muted">{Math.round(o.reliability * 100)}%</span>}
              </li>
            ))}
          </ul>
          <p className="gc-muted text-[11px] mt-2">Estimates — confirm live fares with the operator.</p>
        </div>
      );
    case "plan":
      return (
        <div className={box}>
          <div className="font-display font-semibold">{card.days} days · {card.destination}</div>
          <div className="gc-muted text-xs">{card.total}</div>
          {card.highlights.length > 0 && <ul className="mt-2 list-disc pl-4 space-y-0.5">{card.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
          <Link href={card.href} className="mt-2 inline-flex items-center gap-1 text-[var(--gc-brand)] font-medium">Open full itinerary →</Link>
        </div>
      );
    case "trips":
      return (
        <div className={box}>
          {card.trips.map((t) => (
            <Link key={t.id} href={`/trip/${t.id}`} className="flex items-center justify-between py-1.5 hover:underline">
              <span className="truncate">{t.title}</span><span className="text-xs gc-muted shrink-0">risk {t.risk}</span>
            </Link>
          ))}
        </div>
      );
    case "travelers":
      return (
        <div className={box}>
          <div className="font-medium mb-1.5">{card.title}</div>
          <ul className="space-y-1 max-h-48 overflow-y-auto gc-scroll">
            {card.travelers.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.name} <span className="gc-muted">· {t.destination}</span></span>
                <span className="text-xs tabular-nums shrink-0">{t.exposure}/100 · <span className="capitalize">{t.status === "unknown" ? "unconfirmed" : t.status.replace("_", " ")}</span></span>
              </li>
            ))}
            {card.travelers.length === 0 && <li className="gc-muted">Nobody exposed.</li>}
          </ul>
        </div>
      );
    case "fx":
      return <div className={box}><div className="font-display text-2xl font-semibold">{card.result.toLocaleString("en-IN")} {card.to}</div><div className="gc-muted text-xs">{card.amount} {card.from} · rate {card.rate} · {card.source}</div></div>;
    case "phrase":
      return (
        <div className={box}>
          <div className="gc-muted text-xs">{card.language} · “{card.phrase}”</div>
          <div className="font-display text-2xl mt-1">{card.native}</div>
          <div className="flex items-center justify-between mt-1"><span className="gc-muted">{card.roman}</span><button onClick={() => onSpeak?.(card.native, card.voice)} className="inline-flex items-center gap-1 text-[var(--gc-brand)] text-xs font-medium"><Volume2 className="h-3.5 w-3.5" />Play</button></div>
        </div>
      );
    case "claim":
      return (
        <div className={box}>
          <div className="flex items-center justify-between"><span className="font-medium">{card.regime.replace("_", " ")}</span><span className={card.eligible ? "text-emerald-500 text-xs font-semibold" : "gc-muted text-xs"}>{card.eligible ? "Eligible" : "Not eligible for cash"}</span></div>
          {card.amount > 0 && <div className="font-display text-2xl font-semibold mt-1">{card.currency} {card.amount.toLocaleString("en-IN")}</div>}
          <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-xs">{[...card.reasoning, ...card.entitlements].slice(0, 4).map((r) => <li key={r}>{r}</li>)}</ul>
          <Link href="/claims" className="mt-2 inline-block text-[var(--gc-brand)] text-xs font-medium">Open claims centre →</Link>
        </div>
      );
    case "list":
      return <div className={box}><div className="font-medium mb-1.5">{card.title}</div><ul className="list-disc pl-4 space-y-0.5">{card.items.map((i) => <li key={i}>{i}</li>)}</ul></div>;
    case "emergency":
      return (
        <div className={`${box} ring-1 ring-red-500/40`}>
          <div className="font-medium text-red-500 mb-1.5">Emergency · {card.place}</div>
          <ul className="space-y-1">{card.numbers.map((n) => <li key={n.label} className="flex justify-between"><span>{n.label}</span><a href={`tel:${n.number}`} className="font-mono font-semibold">{n.number}</a></li>)}</ul>
          {card.hospitals.length > 0 && <ul className="mt-2 text-xs gc-muted space-y-0.5">{card.hospitals.map((h) => <li key={h}>{h}</li>)}</ul>}
        </div>
      );
    case "agent":
      return (
        <div className={box}>
          <div className="font-medium">Autonomous cycle complete</div>
          <p className="gc-muted text-xs mt-1">{card.summary}</p>
          <div className="mt-2 flex gap-3 text-xs"><span><b>{card.executed}</b> executed</span><span><b>{card.proposed}</b> awaiting approval</span></div>
          <Link href={`/agent?run=${card.runId}`} className="mt-2 inline-block text-[var(--gc-agent)] text-xs font-medium">See the reasoning trace →</Link>
        </div>
      );
  }
}
