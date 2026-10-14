"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";
interface ToastMsg { id: number; text: string; tone: Tone }

/** Fire-and-forget notifications from anywhere: toast("Saved", "success"). */
export function toast(text: string, tone: Tone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("gc:toast", { detail: { text: String(text).slice(0, 240), tone } }));
}

/** Runs an async UI action and reports failures as a toast instead of an uncaught error. */
export async function attempt<T>(fn: () => Promise<T>, opts: { success?: string; error?: string } = {}): Promise<T | undefined> {
  try {
    const r = await fn();
    if (opts.success) toast(opts.success, "success");
    return r;
  } catch (e) {
    toast(opts.error ?? (e instanceof Error ? e.message : "Something went wrong"), "error");
    return undefined;
  }
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    let n = 0;
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; tone: Tone }>).detail;
      if (!d?.text) return;
      const id = ++n;
      setItems((xs) => [...xs.slice(-3), { id, text: d.text, tone: d.tone }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), d.tone === "error" ? 6000 : 3500);
    };
    window.addEventListener("gc:toast", h);
    return () => window.removeEventListener("gc:toast", h);
  }, []);
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[min(92vw,420px)]" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="gc-panel shadow-2xl px-4 py-3 flex items-start gap-3 text-sm gc-fade-up" role={t.tone === "error" ? "alert" : "status"}>
          {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> : t.tone === "error" ? <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" /> : <Info className="h-4 w-4 mt-0.5 text-sky-500 shrink-0" />}
          <span className="flex-1">{t.text}</span>
          <button aria-label="Dismiss" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}><X className="h-4 w-4 gc-muted" /></button>
        </div>
      ))}
    </div>
  );
}
