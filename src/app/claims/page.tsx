"use client";

import { useState } from "react";
import { toast } from "@/components/gc/toast";
import { Copy, Scale, Check } from "lucide-react";
import { Panel, Btn, PageHeader } from "@/components/gc/ui";
import { postJson, copyText } from "@/components/gc/hooks";
import { cn } from "@/lib/utils";

interface Result { from: string; to: string; distanceKm: number; regime: string; eligible: boolean; amount: number; currency: string; entitlements: string[]; reasoning: string[]; letter: string; disclaimer: string }

export default function Claims() {
  const [f, setF] = useState({ kind: "cancellation", from: "Delhi", to: "Goa", delayHours: 4, noticeDays: 0, basicFareInr: 5500, alternateWithinHours: 6, extraordinary: false, carrierCountry: "" });
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const inp = "h-10 w-full rounded-xl gc-panel-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--gc-brand)]/40";
  const run = async () => {
    setBusy(true); setErr(null);
    try { setRes(await postJson<Result>("/api/claims", { ...f, carrierCountry: f.carrierCountry || undefined })); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-6">
      <PageHeader eyebrow="Passenger rights" title="Get back what the airline owes you." description="Instant entitlement check under India’s DGCA CAR, EU261, UK261 and US DOT rules — with a ready-to-send claim letter. The agent runs this automatically for every cancellation it detects." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Your disruption">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[["cancellation", "Cancelled"], ["delay", "Delayed"], ["denied_boarding", "Denied boarding"]].map(([k, l]) => <button key={k} onClick={() => setF({ ...f, kind: k })} className={cn("rounded-xl border px-2 py-2.5 text-sm", f.kind === k ? "border-[var(--gc-brand)] bg-[var(--gc-brand)]/10 font-semibold" : "gc-line")}>{l}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs gc-muted">
            <label>From (city / airport)<input className={inp} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
            <label>To<input className={inp} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
            {f.kind === "delay" && <label>Arrival delay (hours)<input type="number" min={0} className={inp} value={f.delayHours} onChange={(e) => setF({ ...f, delayHours: Number(e.target.value) })} /></label>}
            {f.kind === "cancellation" && <label>Days of notice given<input type="number" min={0} className={inp} value={f.noticeDays} onChange={(e) => setF({ ...f, noticeDays: Number(e.target.value) })} /></label>}
            {f.kind !== "delay" && <label>Alternate offered within (hours)<input type="number" min={0} className={inp} value={f.alternateWithinHours} onChange={(e) => setF({ ...f, alternateWithinHours: Number(e.target.value) })} /></label>}
            {f.kind === "denied_boarding" && <label>Basic fare + fuel (₹)<input type="number" min={0} className={inp} value={f.basicFareInr} onChange={(e) => setF({ ...f, basicFareInr: Number(e.target.value) })} /></label>}
            <label>Airline country (ISO, optional)<input className={inp} maxLength={2} placeholder="IN, DE, GB…" value={f.carrierCountry} onChange={(e) => setF({ ...f, carrierCountry: e.target.value.toUpperCase() })} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={f.extraordinary} onChange={(e) => setF({ ...f, extraordinary: e.target.checked })} className="accent-[var(--gc-brand)]" />Caused by weather, ATC strike or security (extraordinary)</label>
          {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
          <Btn className="mt-4 w-full" size="lg" loading={busy} onClick={run}><Scale className="h-4 w-4" />Check my entitlement</Btn>
        </Panel>
        <Panel title="Result" subtitle={res ? `${res.from} → ${res.to} · ${res.distanceKm} km` : "Fill the form and check"}>
          {res ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">{res.regime.replace("_", " ")}</span><span className={cn("text-xs font-semibold", res.eligible ? "text-emerald-500" : "gc-muted")}>{res.eligible ? "Eligible" : "No cash compensation"}</span></div>
              {res.amount > 0 && <div className="font-display text-5xl font-semibold">{res.currency === "INR" ? "₹" : `${res.currency} `}{res.amount.toLocaleString("en-IN")}</div>}
              <ul className="text-sm space-y-1 list-disc pl-5">{res.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
              {res.entitlements.length > 0 && <div><div className="text-xs font-semibold gc-muted mb-1">You are also entitled to</div><ul className="text-sm space-y-1 list-disc pl-5">{res.entitlements.map((r) => <li key={r}>{r}</li>)}</ul></div>}
              <div className="gc-panel-2 p-3">
                <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-semibold gc-muted">Claim letter</span><button onClick={async () => { if (await copyText(res.letter)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } else toast("Copy failed — select the letter text manually", "error"); }} className="text-xs inline-flex items-center gap-1 text-[var(--gc-brand)]">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button></div>
                <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">{res.letter}</pre>
              </div>
              <p className="text-[11px] gc-muted">{res.disclaimer}</p>
            </div>
          ) : <p className="gc-muted text-sm">We’ll detect the applicable regime from your route and airline.</p>}
        </Panel>
      </div>
    </main>
  );
}
