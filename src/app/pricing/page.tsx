"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { PLANS, type Plan } from "@/lib/billing/plans";
import { Btn, PageHeader } from "@/components/gc/ui";
import { useUser } from "@/components/auth-provider";
import { postJson } from "@/components/gc/hooks";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const { isSignedIn, user } = useUser();
  const [audience, setAudience] = useState<"traveller" | "business">("business");
  const [pay, setPay] = useState<{ plan: Plan; upiLink?: string; qr?: string; mode: string; message?: string } | null>(null);
  const [utr, setUtr] = useState("");
  const [state, setState] = useState<string | null>(null);
  const plans = PLANS.filter((p) => p.audience === audience || (audience === "business" && p.id === "enterprise"));

  const upgrade = async (p: Plan) => {
    if (!isSignedIn) { window.location.href = `/sign-up?next=/pricing`; return; }
    try {
      const r = await postJson<{ plan: Plan; upiLink?: string; qr?: string; mode: string; message?: string }>("/api/billing/upgrade", { plan: p.id });
      setState(null);
      setPay(r?.plan ? r : { plan: p, mode: "contact_sales", message: "Online payment is not available right now." });
    } catch (e) {
      setPay({ plan: p, mode: "error", message: (e as Error).message });
    }
  };
  const confirm = async () => {
    if (!pay) return;
    try {
      await postJson("/api/billing/upgrade", { plan: pay.plan.id, utr: utr.trim() });
      setState("Plan activated — welcome aboard!");
      setTimeout(() => (window.location.href = "/command"), 1200);
    } catch (e) { setState((e as Error).message); }
  };

  return (
    <main className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
      <PageHeader eyebrow="Pricing" title="Simple plans. Serious protection." description="No AI usage fees, no API keys, no per-alert charges — the SLM and agent run on your own infrastructure." />
      <div className="inline-flex rounded-2xl border gc-line p-1 mb-8" role="tablist">
        {(["traveller", "business"] as const).map((a) => <button key={a} role="tab" aria-selected={audience === a} onClick={() => setAudience(a)} className={cn("px-5 h-10 rounded-xl text-sm font-semibold capitalize", audience === a ? "bg-[var(--gc-brand)] text-white" : "gc-muted")}>{a === "traveller" ? "For travellers" : "For businesses"}</button>)}
      </div>
      <div className={cn("grid gap-4", plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl")}>
        {plans.map((p, i) => {
          const featured = (audience === "business" && p.id === "business") || (audience === "traveller" && p.id === "pro");
          const current = user?.plan === p.id;
          return (
            <div key={p.id} className={cn("gc-panel p-6 flex flex-col", featured && "gc-glow")}>
              {featured && <div className="self-start rounded-full bg-[var(--gc-brand)]/15 text-[var(--gc-brand)] px-2.5 py-0.5 text-[11px] font-semibold mb-3">Most popular</div>}
              <div className="font-display text-xl font-semibold">{p.name}</div>
              <p className="gc-muted text-sm mt-1">{p.tagline}</p>
              <div className="mt-5 font-display text-4xl font-semibold">{p.period === "custom" ? "Let's talk" : p.priceInr === 0 ? "Free" : `₹${p.priceInr.toLocaleString("en-IN")}`}{p.priceInr > 0 && <span className="text-base gc-muted font-normal">/{p.period}</span>}</div>
              <ul className="mt-5 space-y-2 text-sm flex-1">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-[var(--gc-safe)] shrink-0" />{f}</li>)}</ul>
              {p.id === "free" ? <Link href={isSignedIn ? "/command" : "/sign-up"} className="mt-6"><Btn variant="outline" className="w-full">{isSignedIn ? "Open app" : "Start free"}</Btn></Link>
                : p.id === "enterprise" ? <Link href="/contact" className="mt-6"><Btn variant="outline" className="w-full">Contact sales</Btn></Link>
                : <Btn className="mt-6 w-full" variant={featured ? "primary" : "outline"} disabled={current} onClick={() => upgrade(p)}>{current ? "Current plan" : `Upgrade to ${p.name}`}</Btn>}
              <span className="sr-only">{i}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs gc-muted mt-6">Prices in INR, exclusive of GST. Payments by UPI (any app). Cancel anytime.</p>

      {pay && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" role="dialog" aria-label="Complete payment">
          <div className="gc-panel w-full max-w-sm p-6 relative">
            <button onClick={() => { setPay(null); setState(null); }} className="absolute right-3 top-3" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="font-display text-xl font-semibold">{pay.plan.name} · ₹{pay.plan.priceInr.toLocaleString("en-IN")}</div>
            {pay.mode === "upi" ? (
              <>
                <p className="text-sm gc-muted mt-1">Scan with any UPI app, or tap to pay on mobile.</p>
                {pay.qr && <img src={pay.qr} alt="UPI payment QR code" className="mx-auto mt-4 rounded-xl bg-white p-2" width={220} height={220} />}
                <a href={pay.upiLink} className="block mt-3"><Btn className="w-full">Pay with UPI app</Btn></a>
                <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UPI reference / UTR after paying" className="mt-4 w-full h-10 rounded-xl gc-panel-2 px-3 text-sm outline-none" />
                <Btn variant="agent" className="mt-2 w-full" disabled={!/^[A-Za-z0-9]{10,22}$/.test(utr.trim())} onClick={confirm}>I’ve paid — activate</Btn>
              </>
            ) : <p className="text-sm gc-muted mt-3">{pay.message}</p>}
            {state && <p className="mt-3 text-sm">{state}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
