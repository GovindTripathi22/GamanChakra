"use client";

import { useState } from "react";
import { AlertTriangle, Check, Sparkles, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VerificationIssue, VerificationRecoveryOption } from "@/types/verification";

interface ConflictCardProps {
  issue: VerificationIssue;
  recoveryOptions: VerificationRecoveryOption[];
  onApplyFix: (option: VerificationRecoveryOption) => void;
}

export function ConflictCard({
  issue,
  recoveryOptions,
  onApplyFix,
}: ConflictCardProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const isCritical = issue.severity === "critical";

  const handleApply = (opt: VerificationRecoveryOption) => {
    setApplyingId(opt.id);
    onApplyFix(opt);
    setTimeout(() => setApplyingId(null), 600);
  };

  return (
    <div
      className={`rounded-2xl p-4 border transition-all duration-300 ${
        isCritical
          ? "bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100"
          : "bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className={`p-1.5 rounded-lg shrink-0 ${
            isCritical
              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/80 dark:text-amber-300"
          }`}
        >
          {isCritical ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {issue.code.replace(/_/g, " ")}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                isCritical
                  ? "border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-100/50"
                  : "border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-100/50"
              }`}
            >
              {issue.severity}
            </Badge>
          </div>
          <p className="text-xs font-semibold">{issue.message}</p>
          <p className="text-[11px] opacity-80 leading-relaxed">{issue.details}</p>
        </div>
      </div>

      {/* Suggested Recovery Options */}
      {recoveryOptions.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span>Feasible Recovery Solutions ({recoveryOptions.length})</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {recoveryOptions.map((opt) => (
              <div
                key={opt.id}
                className="rounded-xl p-2.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-800 transition-all flex flex-col justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {opt.title}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {opt.confidence}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                    {opt.explanation}
                  </p>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium italic">
                    Trade-off: {opt.tradeOff}
                  </p>
                </div>

                <Button
                  size="sm"
                  className="w-full h-7 text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg gap-1.5 shadow-sm"
                  disabled={applyingId === opt.id}
                  onClick={() => handleApply(opt)}
                >
                  {applyingId === opt.id ? (
                    <>
                      <Check className="h-3 w-3" />
                      Applied!
                    </>
                  ) : (
                    <>
                      One-Tap Fix <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
