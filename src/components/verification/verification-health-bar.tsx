"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Sparkles,
  Train,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VerifiedTripReport } from "@/types/verification";

interface VerificationHealthBarProps {
  report: VerifiedTripReport | null;
  isValidating: boolean;
  onReverify: () => void;
}

export function VerificationHealthBar({
  report,
  isValidating,
  onReverify,
}: VerificationHealthBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (!report) {
    return (
      <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Itinerary Feasibility Engine
            </h4>
            <p className="text-xs text-slate-500">
              Provider timetable, transit buffer, and opening hours checks
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-xs font-semibold gap-1.5"
          onClick={onReverify}
          disabled={isValidating}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
          Run Verification
        </Button>
      </div>
    );
  }

  const hasCritical = report.criticalIssuesCount > 0;
  const hasWarnings = report.warningsCount > 0;
  const isAllGood = report.issuesCount === 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        hasCritical
          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
          : hasWarnings
          ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
          : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
      }`}
    >
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Indicator */}
        <div className="flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              hasCritical
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300"
                : hasWarnings
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300"
            }`}
          >
            {isAllGood ? (
              <ShieldCheck className="h-5 w-5" />
            ) : hasCritical ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Trip Feasibility Health:
              </span>
              <Badge
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                  hasCritical
                    ? "bg-rose-500 text-white"
                    : hasWarnings
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-500 text-white"
                }`}
              >
                {report.overallScore}% Feasible
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {report.summary}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center gap-1 h-8"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{expanded ? "Hide Details" : "Inspect Checks"}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-xs font-semibold gap-1.5 h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            onClick={onReverify}
            disabled={isValidating}
          >
            <RefreshCw className={`h-3 w-3 ${isValidating ? "animate-spin" : ""}`} />
            Re-verify
          </Button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Stops</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                {report.itemsVerifiedCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Transit Feasibility</div>
              <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                Live OSRM Checked
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Venue Hours</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                Directory Checked
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Flagged Issues</div>
              <div
                className={`text-sm font-extrabold ${
                  report.issuesCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                }`}
              >
                {report.issuesCount}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Last verified: {new Date(report.verifiedAt).toLocaleTimeString()} using Project OSRM and OpenStreetMap geocoding.
          </p>
        </div>
      )}
    </div>
  );
}
