"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Btn } from "@/components/gc/ui";

export interface TourStep { target: string; title: string; body: ReactNode }

const PAD = 8;
const GAP = 14;
const MARGIN = 12;

function findTarget(target: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Hidden (display:none on this breakpoint) elements have no box — treat them as missing.
  return r.width > 0 && r.height > 0 ? el : null;
}

/**
 * In-app guided tour: dims the page, spotlights one section at a time and explains it in plain language.
 * Steps whose target is not on screen (e.g. hidden on mobile) are skipped automatically.
 */
export function ProductTour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  const dir = useRef<1 | -1>(1);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) { setI(0); dir.current = 1; } }, [open]);

  const measure = useCallback(() => {
    const step = steps[i];
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [steps, i]);

  // Move to the step's element (or skip it when it isn't rendered).
  useEffect(() => {
    if (!open) return;
    const step = steps[i];
    if (!step) { onClose(); return; }
    const el = findTarget(step.target);
    if (!el) {
      const n = i + dir.current;
      if (n >= steps.length) { onClose(); return; }
      if (n < 0) { dir.current = 1; if (i + 1 < steps.length) setI(i + 1); else onClose(); return; }
      setI(n);
      return;
    }
    const r = el.getBoundingClientRect();
    const HEADER = 96; // floating app header — never let it cover the spotlight
    const vh = window.innerHeight;
    const fits = r.top >= HEADER && r.bottom <= vh - 40;
    if (!fits) {
      const tall = r.height > (vh - HEADER) * 0.6;
      const y = window.scrollY + r.top - (tall ? HEADER : Math.max(HEADER, (vh - r.height) / 2));
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
    measure();
    const t1 = setTimeout(measure, 120), t2 = setTimeout(measure, 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open, i, steps, measure, onClose]);

  // Keep the spotlight glued to the element while the page scrolls, resizes or re-renders.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const iv = setInterval(measure, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, true); };
  }, [open, measure]);

  // Place the explanation card next to the spotlight, always fully on screen.
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = tipRef.current.offsetWidth, h = tipRef.current.offsetHeight;
    if (!rect) { setTip({ top: Math.max(MARGIN, (vh - h) / 2), left: Math.max(MARGIN, (vw - w) / 2) }); return; }
    let top: number;
    if (rect.top + rect.height + GAP + h <= vh - MARGIN) top = rect.top + rect.height + GAP;
    else if (rect.top - GAP - h >= MARGIN) top = rect.top - GAP - h;
    else top = vh - h - MARGIN; // tall element: dock the card at the bottom of the screen
    const left = Math.min(Math.max(MARGIN, rect.left), Math.max(MARGIN, vw - w - MARGIN));
    setTip((p) => (p && Math.abs(p.top - top) < 0.5 && Math.abs(p.left - left) < 0.5 ? p : { top, left }));
  }, [open, rect, i]);

  const go = useCallback((d: 1 | -1) => {
    dir.current = d;
    setI((n) => {
      const next = n + d;
      if (next >= steps.length) { onClose(); return n; }
      return Math.max(0, next);
    });
  }, [steps.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, go, onClose]);

  useEffect(() => { if (open) nextRef.current?.focus({ preventScroll: true }); }, [open, i]);

  if (!open || !steps[i]) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Click-catcher so the page underneath can't be clicked mid-tour */}
      <div className="absolute inset-0" onClick={() => go(1)} style={{ background: rect ? "transparent" : "rgba(5,8,15,.62)" }} />
      {rect && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300 ease-out ring-2 ring-[var(--gc-brand)]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(5,8,15,.62)" }}
        />
      )}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${i + 1} of ${steps.length}: ${step.title}`}
        className="absolute w-[380px] max-w-[calc(100vw-24px)] gc-panel p-4 shadow-2xl gc-fade-up"
        style={{ top: tip?.top ?? -9999, left: tip?.left ?? -9999, visibility: tip ? "visible" : "hidden" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gc-brand)]">Step {i + 1} of {steps.length}</div>
          <button onClick={onClose} className="h-7 w-7 -mt-1 -mr-1 grid place-items-center rounded-lg hover:bg-[var(--gc-panel-2)]" aria-label="Close tour"><X className="h-4 w-4" /></button>
        </div>
        <h3 className="font-display text-lg font-semibold mt-1">{step.title}</h3>
        <div className="text-sm gc-muted mt-1.5 leading-relaxed">{step.body}</div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex gap-1 mr-auto" aria-hidden>
            {steps.map((s, n) => <span key={s.target + n} className={n === i ? "h-1.5 w-4 rounded-full bg-[var(--gc-brand)]" : "h-1.5 w-1.5 rounded-full bg-[var(--gc-line)]"} />)}
          </div>
          {i > 0 && <Btn size="sm" variant="ghost" onClick={() => go(-1)}><ArrowLeft className="h-3.5 w-3.5" />Back</Btn>}
          <Btn ref={nextRef} size="sm" onClick={() => go(1)}>{last ? "Finish" : "Next"}{!last && <ArrowRight className="h-3.5 w-3.5" />}</Btn>
        </div>
      </div>
    </div>
  );
}
