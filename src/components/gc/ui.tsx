"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_META, type NewsCategory } from "@/lib/slm/labels";

export function Panel({ className, children, title, action, subtitle, pad = true }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode; pad?: boolean }) {
  return (
    <section className={cn("gc-panel overflow-hidden", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b gc-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold truncate">{title}</h2>
            {subtitle && <p className="gc-muted text-xs mt-0.5 truncate">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "brand" | "agent" | "safe" | "warn" | "crit"; icon?: ReactNode }) {
  const color = { default: "var(--gc-text)", brand: "var(--gc-brand)", agent: "var(--gc-agent)", safe: "var(--gc-safe)", warn: "var(--gc-warn)", crit: "var(--gc-crit)" }[tone];
  return (
    <div className="gc-panel px-4 py-3.5">
      <div className="flex items-center justify-between gc-muted text-[11px] uppercase tracking-[0.12em]">
        <span>{label}</span>
        {icon}
      </div>
      <div className="font-display text-[28px] leading-none font-semibold mt-2 tabular-nums" style={{ color }}>{value}</div>
      {hint && <div className="gc-muted text-xs mt-1.5 truncate">{hint}</div>}
    </div>
  );
}

const SEV: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/20",
  moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  high: "bg-orange-500/12 text-orange-700 dark:text-orange-300 ring-orange-500/30",
  critical: "bg-red-500/12 text-red-700 dark:text-red-300 ring-red-500/35",
};
export function SeverityBadge({ severity }: { severity: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ring-1", SEV[severity] ?? SEV.low)}>{severity}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category as NewsCategory];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${meta.color}1a`, color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function ProvenanceBadge({ provenance }: { provenance: string }) {
  if (provenance !== "sample") return <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE</span>;
  return <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider bg-violet-500/15 text-violet-600 dark:text-violet-300">DRILL</span>;
}

export function RiskMeter({ score, size = 64 }: { score: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--gc-crit)" : score >= 55 ? "#f97316" : score >= 35 ? "var(--gc-warn)" : score >= 15 ? "#eab308" : "var(--gc-safe)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Risk ${score} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gc-line)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" className="font-display" fontSize={size * 0.3} fontWeight={700} fill="currentColor">{score}</text>
    </svg>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "agent" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean };
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ className, variant = "primary", size = "md", loading, children, disabled, ...rest }, ref) {
  const v = {
    primary: "bg-[var(--gc-brand)] text-white hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(255,106,26,.6)]",
    agent: "bg-[var(--gc-agent)] text-white hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(124,92,255,.6)]",
    ghost: "hover:bg-[var(--gc-panel-2)]",
    outline: "border gc-line hover:bg-[var(--gc-panel-2)]",
    danger: "bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/20",
  }[variant];
  const s = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" }[size];
  return (
    <button ref={ref} disabled={disabled || loading} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-brand)]", v, s, className)} {...rest}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      {icon && <div className="mb-3 gc-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="gc-muted text-sm mt-1 max-w-sm">{children}</div>}
    </div>
  );
}

export function timeAgo(d: string | Date): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gc-brand)] mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-3xl md:text-[34px] font-semibold leading-tight">{title}</h1>
        {description && <p className="gc-muted mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
