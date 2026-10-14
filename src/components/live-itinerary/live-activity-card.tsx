"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Link as LinkIcon,
  Sparkles,
  CloudRain,
  Umbrella,
  IndianRupee,
} from "lucide-react";
import type { Activity, LiveStepOutcome } from "@/types/trip";
import type { ItemVerification, VerificationRecoveryOption } from "@/types/verification";
import { CrowdBadge } from "@/components/crowd-badge";
import { TrustBadge } from "@/components/trust/trust-badge";
import { ConflictCard } from "@/components/verification/conflict-card";

interface LiveActivityCardProps {
  activity: Activity;
  index: number;
  tripId: string;
  onReportOutcome: (activity: Activity, outcome: LiveStepOutcome) => void;
  verification?: ItemVerification;
  onApplyFix?: (opt: VerificationRecoveryOption) => void;
}

export function LiveActivityCard({
  activity,
  index,
  tripId,
  onReportOutcome,
  verification,
  onApplyFix,
}: LiveActivityCardProps) {
  const [reporting, setReporting] = useState(false);

  const status = activity.status || "scheduled";

  const getStatusBadge = () => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
            In Progress
          </Badge>
        );
      case "delayed":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Delayed (+{activity.actualOutcome?.actualDelayMinutes || 30}m)
          </Badge>
        );
      case "rebooked":
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Auto-Healed
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700">
            Scheduled
          </Badge>
        );
    }
  };

  const handleQuickReport = (type: "on_time" | "delayed" | "crowded") => {
    let outcome: LiveStepOutcome;
    if (type === "on_time") {
      outcome = {
        actualDelayMinutes: 0,
        actualCrowdLevel: activity.crowdLevel || "moderate",
        reportedAt: new Date().toISOString(),
        reporterStatus: "on_time",
        notes: "On-time arrival verified by traveler telemetry",
      };
    } else if (type === "delayed") {
      outcome = {
        actualDelayMinutes: 35,
        actualCrowdLevel: "moderate",
        reportedAt: new Date().toISOString(),
        reporterStatus: "delayed",
        notes: "Reported 35-minute transit lag",
      };
    } else {
      outcome = {
        actualDelayMinutes: 15,
        actualCrowdLevel: "peak",
        reportedAt: new Date().toISOString(),
        reporterStatus: "crowded",
        notes: "Heavy entrance queue encountered",
      };
    }

    onReportOutcome(activity, outcome);
    setReporting(false);
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all p-5 shadow-sm ${
        activity.isGapFiller
          ? "border-emerald-300/80 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : status === "delayed"
          ? "border-amber-300/80 bg-amber-50/20 dark:border-amber-900/50 dark:bg-amber-950/20"
          : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      {/* Top Header: Number, Title, Status */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-600 dark:text-orange-400">
            {index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {activity.title || activity.place_name}
              </h4>
              {getStatusBadge()}
              {verification?.provenance && (
                <TrustBadge provenance={verification.provenance} />
              )}
              {activity.isGapFiller && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-emerald-500/30">
                  Off-Peak Deal
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                {activity.startTime && activity.endTime
                  ? `${activity.startTime} - ${activity.endTime}`
                  : activity.timeSlot || activity.time}
              </span>
              {(activity.locationName || activity.place_name) && (
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {activity.locationName || activity.place_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Crowd Badge */}
        <CrowdBadge
          crowdLevel={activity.crowdLevel}
          offPeakTip={activity.offPeakTip}
          bookingDeadline={activity.bookingDeadline}
        />
      </div>

      {/* Flagged Feasibility Conflict Card */}
      {verification?.issue && (
        <div className="mb-3">
          <ConflictCard
            issue={verification.issue}
            recoveryOptions={verification.recoveryOptions}
            onApplyFix={onApplyFix || (() => {})}
          />
        </div>
      )}

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
        {activity.description || activity.details}
      </p>

      {/* Reactive Object Metadata Bar (Dependencies, Predictions, Shield) */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-3 mb-3 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Dependency Link */}
          {activity.dependencyTitle && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 py-0.5 px-2 rounded-md border border-slate-200/60 dark:border-slate-800">
              <LinkIcon className="h-3 w-3 text-indigo-500" />
              <span>Prereq: {activity.dependencyTitle}</span>
            </span>
          )}

          {/* AI Risk Prediction */}
          {activity.prediction && (
            <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 py-0.5 px-2 rounded-md border border-slate-200/60 dark:border-slate-800">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Delay Risk: {activity.prediction.delayRiskScore}%
            </span>
          )}

          {/* Weather Tag */}
          {activity.prediction?.weatherSensitivity === "outdoor_high" ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 py-0.5 px-2 rounded-md">
              <CloudRain className="h-3 w-3" />
              Monsoon Sensitive
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 py-0.5 px-2 rounded-md">
              <Umbrella className="h-3 w-3" />
              Sheltered
            </span>
          )}
        </div>

        {/* Voyage Shield Assurance */}
        {activity.isProtectedByShield && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Shield Protected (₹{activity.shieldPayoutAmount || 1500})
          </span>
        )}
      </div>

      {/* Ground-Truth Telemetry Reporter Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Ground Status:</span>
          {activity.actualOutcome ? (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Logged: {activity.actualOutcome.notes || "Recorded"}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                onClick={() => handleQuickReport("on_time")}
              >
                ✓ On Time
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
                onClick={() => handleQuickReport("delayed")}
              >
                ⚠ Delay (+35m)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                onClick={() => handleQuickReport("crowded")}
              >
                👥 Crowd Choke
              </Button>
            </div>
          )}
        </div>

        {/* Cost / Ticket Info & Map Link */}
        <div className="flex items-center gap-3">
          {(activity.ticket_price || activity.estimatedCost) && (
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>Entry:</span>
              <span>
                {activity.estimatedCost
                  ? `${activity.estimatedCost.currency}${activity.estimatedCost.amount}`
                  : activity.ticket_price}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-[11px] font-semibold h-6 px-2 rounded-full"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((activity.title || activity.place_name || "") + " " + (activity.locationName || ""))}`, '_blank')}
          >
            Map →
          </Button>
        </div>
      </div>
    </div>
  );
}
