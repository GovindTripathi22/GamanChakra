"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  CloudRain,
  Umbrella,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Activity, LiveStepOutcome } from "@/types/trip";
import type { ItemVerification, VerificationRecoveryOption } from "@/types/verification";
import { CrowdBadge } from "@/components/crowd-badge";
import { ConflictCard } from "@/components/verification/conflict-card";

interface LiveActivityCardProps {
  activity: Activity;
  index: number;
  tripId?: string;
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
  const [showStatusOptions, setShowStatusOptions] = useState(false);

  const status = activity.status || "scheduled";

  const getStatusBadge = () => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
            In Progress
          </Badge>
        );
      case "delayed":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            Delayed (+{activity.actualOutcome?.actualDelayMinutes || 30}m)
          </Badge>
        );
      case "rebooked":
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 flex items-center gap-1 text-[11px]">
            <Sparkles className="h-3 w-3" />
            Auto-Healed
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTimePeriodBadge = () => {
    const timeStr = activity.startTime || activity.timeSlot || "";
    const hour = parseInt(timeStr.split(":")[0], 10);
    if (!isNaN(hour)) {
      if (hour < 12) return { label: "Morning", icon: "🌅", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40" };
      if (hour < 17) return { label: "Afternoon", icon: "☀️", bg: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40" };
      return { label: "Evening", icon: "🌙", bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40" };
    }
    return { label: "Daytime", icon: "✨", bg: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  };

  const period = getTimePeriodBadge();

  const handleQuickReport = (type: "on_time" | "delayed" | "crowded") => {
    let outcome: LiveStepOutcome;
    if (type === "on_time") {
      outcome = {
        actualDelayMinutes: 0,
        actualCrowdLevel: activity.crowdLevel || "moderate",
        reportedAt: new Date().toISOString(),
        reporterStatus: "on_time",
        notes: "On-time arrival verified",
      };
    } else if (type === "delayed") {
      outcome = {
        actualDelayMinutes: 35,
        actualCrowdLevel: "moderate",
        reportedAt: new Date().toISOString(),
        reporterStatus: "delayed",
        notes: "Reported 35-minute delay",
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
    setShowStatusOptions(false);
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all p-5 shadow-xs hover:shadow-md ${
        activity.isGapFiller
          ? "border-emerald-300/80 bg-emerald-50/20 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : status === "delayed"
          ? "border-amber-300/80 bg-amber-50/20 dark:border-amber-900/50 dark:bg-amber-950/20"
          : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      {/* Top Header: Step Number, Time, Category, Crowd Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Step Number */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-600 dark:text-orange-400">
            {index + 1}
          </div>

          {/* Time & Period Pill */}
          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold border ${period.bg}`}>
            <span>{period.icon}</span>
            <span>{period.label}</span>
            <span className="text-slate-400 font-normal">·</span>
            <span>
              {activity.startTime && activity.endTime
                ? `${activity.startTime} - ${activity.endTime}`
                : activity.timeSlot || activity.time}
            </span>
          </span>

          {/* Category Badge */}
          {activity.category && (
            <span className="capitalize text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {activity.category}
            </span>
          )}

          {getStatusBadge()}
        </div>

        {/* Crowd / Off-Peak Badge */}
        <CrowdBadge
          crowdLevel={activity.crowdLevel}
          offPeakTip={activity.offPeakTip}
          bookingDeadline={activity.bookingDeadline}
        />
      </div>

      {/* Title & Location */}
      <div className="mb-2">
        <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
          {activity.title || activity.place_name}
        </h4>
        {(activity.locationName || activity.place_name) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="truncate">{activity.locationName || activity.place_name}</span>
          </div>
        )}
      </div>

      {/* Flagged Conflict Card if any */}
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

      {/* Traveler Tip Banner */}
      {activity.offPeakTip && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 p-2.5 text-xs text-orange-950 dark:text-orange-200">
          <Sparkles className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <span className="font-bold">Traveler Tip:</span> {activity.offPeakTip}
          </span>
        </div>
      )}

      {/* Weather Tag (Only if outdoor monsoon sensitive) */}
      {activity.prediction?.weatherSensitivity === "outdoor_high" && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1 rounded-lg">
          <CloudRain className="h-3.5 w-3.5 text-amber-500" />
          <span>Outdoor venue — carry an umbrella or light raincoat if overcast</span>
        </div>
      )}

      {/* Bottom Action & Info Row */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Cost & Shield Info */}
        <div className="flex items-center gap-3">
          {(activity.ticket_price || activity.estimatedCost) && (
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span className="text-slate-400 font-normal">Ticket / Entry:</span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">
                {activity.ticket_price || (activity.estimatedCost ? `${activity.estimatedCost.currency}${activity.estimatedCost.amount}` : "Free")}
              </span>
            </div>
          )}
          {activity.isProtectedByShield && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>Shield Protected</span>
            </span>
          )}
        </div>

        {/* Actions: Maps link and optional Live Status reporter */}
        <div className="flex items-center gap-2">
          {activity.actualOutcome ? (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {activity.actualOutcome.notes || "Logged On Time"}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 rounded-full cursor-pointer"
              onClick={() => setShowStatusOptions(!showStatusOptions)}
              title="Report actual arrival time or crowd status"
            >
              <span>Live Status</span>
              {showStatusOptions ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 border-orange-200 dark:border-orange-800/60 text-xs font-semibold h-7 px-3 rounded-full flex items-center gap-1 cursor-pointer"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (activity.title || activity.place_name || "") + " " + (activity.locationName || "")
                )}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <MapPin className="h-3 w-3 text-orange-500" />
            <span>View on Maps ↗</span>
          </Button>
        </div>
      </div>

      {/* Expandable Live Status Reporting Options */}
      {showStatusOptions && !activity.actualOutcome && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500">Record Ground Status:</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 cursor-pointer"
              onClick={() => handleQuickReport("on_time")}
            >
              ✓ On Time
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2.5 rounded-md hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 cursor-pointer"
              onClick={() => handleQuickReport("delayed")}
            >
              ⚠ Delay (+35m)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2.5 rounded-md hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 cursor-pointer"
              onClick={() => handleQuickReport("crowded")}
            >
              👥 Heavy Crowd
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
