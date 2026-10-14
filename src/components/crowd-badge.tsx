"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, AlertCircle, Info, CalendarClock } from "lucide-react";

interface CrowdBadgeProps {
  crowdLevel?: "low" | "moderate" | "peak";
  offPeakTip?: string;
  bookingDeadline?: "walk-in" | "3-7 days advance" | "30+ days required";
  className?: string;
}

export function CrowdBadge({
  crowdLevel,
  offPeakTip,
  bookingDeadline,
  className = "",
}: CrowdBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  if (!crowdLevel && !bookingDeadline && !offPeakTip) {
    return null;
  }

  // Crowd level badge configuration
  const crowdConfig = {
    low: {
      label: "Low Crowds",
      classes:
        "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      dotClass: "bg-emerald-500",
    },
    moderate: {
      label: "Moderate",
      classes:
        "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      dotClass: "bg-amber-500",
    },
    peak: {
      label: "Peak Rush",
      classes:
        "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      dotClass: "bg-rose-500",
    },
  };

  const currentCrowd = crowdLevel ? crowdConfig[crowdLevel] : null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Crowd Level Indicator */}
      {currentCrowd && (
        <Badge
          variant="outline"
          className={`relative text-[11px] font-semibold py-0.5 px-2.5 rounded-full flex items-center gap-1.5 transition-all ${currentCrowd.classes}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${currentCrowd.dotClass} animate-pulse`} />
          <Users className="h-3 w-3 opacity-80" />
          <span>{currentCrowd.label}</span>
        </Badge>
      )}

      {/* Booking Urgency Badge */}
      {bookingDeadline === "30+ days required" && (
        <Badge
          variant="outline"
          className="bg-rose-100/80 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700 text-[11px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          <span>Book 30+ Days Ahead</span>
        </Badge>
      )}

      {bookingDeadline === "3-7 days advance" && (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-[11px] font-medium py-0.5 px-2 rounded-full flex items-center gap-1"
        >
          <CalendarClock className="h-3 w-3 text-blue-500" />
          <span>Reserve 3-7d Prior</span>
        </Badge>
      )}

      {bookingDeadline === "walk-in" && (
        <Badge
          variant="outline"
          className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 text-[11px] font-normal py-0.5 px-2 rounded-full"
        >
          Walk-in Welcome
        </Badge>
      )}

      {/* Interactive Off-Peak Tip Trigger */}
      {offPeakTip && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowTip((prev) => !prev)}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            className="flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200/80 px-2 py-0.5 text-[11px] font-medium text-orange-700 hover:bg-orange-100 transition-colors dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
          >
            <Sparkles className="h-3 w-3 text-orange-500" />
            <span>Off-Peak Perk</span>
            <Info className="h-3 w-3 text-orange-400 opacity-70" />
          </button>

          {/* Floating Tooltip Callout */}
          {showTip && (
            <div className="absolute left-0 bottom-full mb-1.5 z-50 w-64 rounded-xl bg-slate-900 text-white p-2.5 text-xs shadow-xl ring-1 ring-white/10 backdrop-blur-md animate-in fade-in-0 zoom-in-95">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-300 mb-0.5">Off-Peak Advantage</p>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{offPeakTip}</p>
                </div>
              </div>
              <div className="absolute left-4 top-full -mt-1 h-2 w-2 rotate-45 bg-slate-900" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
