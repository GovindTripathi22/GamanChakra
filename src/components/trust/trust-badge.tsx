"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle, AlertCircle, Sparkles } from "lucide-react";
import type { FactProvenance } from "@/lib/providers/types";

interface TrustBadgeProps {
  provenance: FactProvenance;
  className?: string;
  showDetails?: boolean;
}

export function TrustBadge({
  provenance,
  className = "",
  showDetails = false,
}: TrustBadgeProps) {
  const { source, lastCheckedAt, status, isMock } = provenance;

  const formattedTime = lastCheckedAt
    ? new Date(lastCheckedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Recently";

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* Principle P2: Labeled Demo Data Badge */}
      {isMock && (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0"
        >
          Demo data
        </Badge>
      )}

      {/* Principle P1: Trust Status Badge */}
      {status === "verified" && (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium px-1.5 py-0 flex items-center gap-1"
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Verified ({formattedTime})</span>
        </Badge>
      )}

      {status === "estimated" && (
        <Badge
          variant="outline"
          className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-medium px-1.5 py-0 flex items-center gap-1"
        >
          <Sparkles className="h-3 w-3 text-blue-500" />
          <span>Estimated ({formattedTime})</span>
        </Badge>
      )}

      {status === "unverified" && (
        <Badge
          variant="outline"
          className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-medium px-1.5 py-0 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3 text-rose-500" />
          <span>Unverified: Call to confirm</span>
        </Badge>
      )}

      {/* Optional Source Detail */}
      {showDetails && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          • {source}
        </span>
      )}
    </div>
  );
}
