"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, User, PlayCircle } from "lucide-react";
import { ChakraMark } from "@/components/brand";
import { Btn } from "@/components/gc/ui";
import { cn } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/command";
  const [form, setForm] = useState({ name: "", email: "", password: "", orgName: "", orgKind: "personal" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await fetch(mode === "sign-in" ? "/api/auth/signin" : "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "sign-in" ? { email: form.email, password: form.password } : form) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.issues?.[0] ? `${j.issues[0].path}: ${j.issues[0].message}` : j.error ?? "Something went wrong");
      window.location.href = next;
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(!m || /failed to fetch|networkerror|load failed/i.test(m) ? "Can't reach the server. Check your connection and try again." : m);
    } finally { setLoading(false); }
  };
  const demo = async () => {
    if (demoLoading) return;
    setDemoLoading(true); setError(null);
    try {
      const r = await fetch("/api/auth/demo", { method: "POST" });
      if (r.ok) { window.location.href = "/command"; return; }
      setError(r.status === 429 ? "Too many attempts — please wait a few seconds." : "Demo is unavailable on this deployment.");
    } catch { setError("Can't reach the server. Is it running?"); }
    setDemoLoading(false);
  };
  const field = "w-full h-11 rounded-xl gc-panel-2 px-3.5 text-sm outline-none focus:ring-2 focus:ring-[var(--gc-brand)]/50";

  return (
    <main className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 border-r gc-line gc-grid-bg">
        <div className="absolute -left-40 -bottom-40 opacity-25"><ChakraMark size={620} spin /></div>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gc-brand)]">Voyage · Travel OS</div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] mt-4 max-w-md">The world changes every minute. <span className="gc-gradient-text">Your trips should too.</span></h1>
        </div>
        <ul className="relative space-y-3 text-sm max-w-md">
          {["Reads 10 live global news & disaster feeds — no API keys", "In-house SLM classifies every headline in under a millisecond", "Autonomous agent re-routes, checks in and drafts claims", "Talk to it: “Hey Chakra, is Bangkok safe this week?”"].map((t) => (
            <li key={t} className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full bg-[var(--gc-brand)] shrink-0" /><span>{t}</span></li>
          ))}
        </ul>
      </aside>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="font-display text-3xl font-semibold">{mode === "sign-in" ? "Welcome back" : "Create your workspace"}</h2>
          <p className="gc-muted mt-1.5 text-sm">{mode === "sign-in" ? "Sign in to Mission Control." : "Free forever for travellers. Teams get duty-of-care automations."}</p>

          <button onClick={demo} disabled={demoLoading} className="mt-6 w-full rounded-2xl border gc-line p-4 text-left hover:bg-[var(--gc-panel-2)] transition group">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-8 w-8 text-[var(--gc-agent)]" />
              <div className="flex-1"><div className="font-semibold">{demoLoading ? "Preparing live demo…" : "Try the live demo — no sign-up"}</div><div className="gc-muted text-xs">Pre-loaded travel company with 24 travellers and an armed agent</div></div>
              <ArrowRight className="h-4 w-4 gc-muted group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          <div className="flex items-center gap-3 my-6 text-xs gc-muted"><span className="h-px flex-1 bg-[var(--gc-line)]" />or with email<span className="h-px flex-1 bg-[var(--gc-line)]" /></div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "sign-up" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: "personal", l: "Traveller", i: User }, { v: "tmc", l: "Business / Agency", i: Building2 }].map((o) => (
                    <button type="button" key={o.v} onClick={() => setForm({ ...form, orgKind: o.v })} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm", form.orgKind === o.v ? "border-[var(--gc-brand)] bg-[var(--gc-brand)]/10" : "gc-line")}><o.i className="h-4 w-4" />{o.l}</button>
                  ))}
                </div>
                <input className={field} placeholder="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
                {form.orgKind !== "personal" && <input className={field} placeholder="Company / agency name" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />}
              </>
            )}
            <input className={field} type="email" placeholder="Work email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className={field} type="password" placeholder="Password (8+ characters)" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            <Btn type="submit" loading={loading} className="w-full" size="lg">{mode === "sign-in" ? "Sign in" : "Create account"}</Btn>
          </form>
          <p className="mt-5 text-sm gc-muted text-center">
            {mode === "sign-in" ? <>New here? <Link className="text-[var(--gc-brand)] font-medium" href={`/sign-up${next !== "/command" ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></> : <>Already have an account? <Link className="text-[var(--gc-brand)] font-medium" href="/sign-in">Sign in</Link></>}
          </p>
        </div>
      </section>
    </main>
  );
}
