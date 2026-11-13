"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, LifeBuoy, CheckCircle2 } from "lucide-react";
import { ChakraMark } from "@/components/brand";

interface Info { status: string; reason: string; traveler: { name: string; destinationCity: string }; expiresAt: string }

/** Mobile-first traveller check-in page. The link itself is the credential — no app, no login. */
export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(`/api/checkin/${encodeURIComponent(String(token ?? ""))}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? "This link is not valid."); return; }
      setInfo(j);
      if (j.status !== "pending" && j.status !== "expired") setDone(j.status);
    } catch { setErr("No connection. Check your signal and tap retry."); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const respond = async (status: "safe" | "needs_help") => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/checkin/${encodeURIComponent(String(token ?? ""))}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, message: msg.trim() || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error ?? "Could not send your reply. Please try again.");
      else setDone(status);
    } catch {
      setErr("No connection — your reply was not sent. Please try again, or call 112 if you are in danger.");
    } finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen grid place-items-center px-5 py-10 bg-[var(--gc-bg)]">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center"><ChakraMark size={48} /></div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gc-brand)] mt-3">Voyage safety check</div>
        {err && <div className="mt-6" role="alert"><p className="text-red-500">{err}</p>{!info && <button onClick={load} className="mt-3 rounded-xl border gc-line px-4 py-2 text-sm">Retry</button>}</div>}
        {!err && !info && <p className="mt-6 gc-muted">Loading…</p>}
        {info && !done && (
          <>
            <h1 className="font-display text-3xl font-semibold mt-3">Hi {info.traveler.name.split(" ")[0]}, are you safe?</h1>
            <p className="gc-muted mt-3 text-sm leading-relaxed">We noticed: <b className="text-[var(--gc-text)]">{String(info.reason ?? "").replace(/^drill:\s*/i, "")}</b> near {info.traveler.destinationCity}.</p>
            {info.status === "expired" ? <p className="mt-6 text-amber-500">This link has expired. Please contact your travel desk.</p> : (
              <>
                <button onClick={() => respond("safe")} disabled={busy} className="mt-8 w-full h-16 rounded-2xl bg-emerald-500 text-white text-lg font-semibold flex items-center justify-center gap-2 active:scale-[.98] transition"><ShieldCheck className="h-6 w-6" />I’m safe</button>
                <textarea value={msg} maxLength={500} onChange={(e) => setMsg(e.target.value)} placeholder="Optional: where are you / what do you need?" rows={2} className="mt-4 w-full rounded-xl gc-panel p-3 text-sm outline-none" />
                <button onClick={() => respond("needs_help")} disabled={busy} className="mt-3 w-full h-14 rounded-2xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[.98] transition"><LifeBuoy className="h-5 w-5" />I need help</button>
                <p className="mt-6 text-[11px] gc-muted">In immediate danger? Call <a href="tel:112" className="font-semibold">112</a>.</p>
              </>
            )}
          </>
        )}
        {done && (
          <div className="mt-8">
            <CheckCircle2 className={`h-14 w-14 mx-auto ${done === "safe" ? "text-emerald-500" : "text-red-500"}`} />
            <h1 className="font-display text-2xl font-semibold mt-3">{done === "safe" ? "Thanks — your team has been told you’re safe." : "Help is on the way. Your travel desk has been alerted."}</h1>
            <p className="gc-muted text-sm mt-2">You can close this page.</p>
          </div>
        )}
      </div>
    </main>
  );
}
