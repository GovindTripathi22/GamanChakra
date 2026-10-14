"use client";

import { useState } from "react";
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building,
  Plane,
  Utensils,
  Ticket,
  Car,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CostBreakdown, CostLineItem } from "@/types/cost";
import { TrustBadge } from "@/components/trust/trust-badge";

interface TrueCostBreakdownProps {
  breakdown: CostBreakdown | null;
  onUpdateSpendCap?: (newCap: number) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  stay: <Building className="h-4 w-4 text-blue-500" />,
  transport: <Plane className="h-4 w-4 text-purple-500" />,
  food: <Utensils className="h-4 w-4 text-emerald-500" />,
  activities: <Ticket className="h-4 w-4 text-orange-500" />,
  local_transit: <Car className="h-4 w-4 text-amber-500" />,
  taxes_fees: <Receipt className="h-4 w-4 text-slate-500" />,
  unexpected_buffer: <ShieldCheck className="h-4 w-4 text-teal-500" />,
};

export function TrueCostBreakdown({
  breakdown,
  onUpdateSpendCap,
}: TrueCostBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingCap, setEditingCap] = useState(false);
  const [capInput, setCapInput] = useState(
    breakdown?.userBudgetCap ? breakdown.userBudgetCap.toString() : ""
  );

  if (!breakdown) {
    return (
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              True Trip Cost Engine
            </h3>
            <p className="text-xs text-slate-500">
              Calculating itemized regional costs and taxes...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const isOverBudget = breakdown.budgetStatus === "exceeds_budget";
  const isNearBudget = breakdown.budgetStatus === "near_budget";

  const handleSaveCap = () => {
    const val = parseInt(capInput.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val) && val > 0 && onUpdateSpendCap) {
      onUpdateSpendCap(val);
    }
    setEditingCap(false);
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                True Trip Cost
                <span className="text-xs font-normal text-slate-400">
                  ({breakdown.durationDays}d, {breakdown.style})
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Transparent itemized breakdown including GST & emergency buffer
              </p>
            </div>
          </div>

          <TrustBadge provenance={breakdown.provenance} />
        </div>

        {/* Expected Price Range Display */}
        <div className="pt-2 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Expected Range ({breakdown.travelersCount} travelers)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            ₹{breakdown.totalMin.toLocaleString("en-IN")} – ₹{breakdown.totalMax.toLocaleString("en-IN")}
          </div>
          <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-0.5">
            Midpoint: ~₹{breakdown.expectedTotal.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Budget Status & Spend Cap Bar */}
        <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isOverBudget ? (
              <Badge className="bg-rose-500 text-white text-xs font-bold gap-1 px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" />
                Over Cap by ₹{breakdown.overageAmount?.toLocaleString("en-IN")}
              </Badge>
            ) : isNearBudget ? (
              <Badge className="bg-amber-500 text-white text-xs font-bold gap-1 px-2 py-0.5">
                <Info className="h-3 w-3" />
                Near Budget Cap
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white text-xs font-bold gap-1 px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                Within Budget
              </Badge>
            )}

            <span className="text-xs text-slate-500">
              Cap:{" "}
              <strong className="text-slate-900 dark:text-white">
                {breakdown.userBudgetCap
                  ? `₹${breakdown.userBudgetCap.toLocaleString("en-IN")}`
                  : "Not set"}
              </strong>
            </span>
          </div>

          <div>
            {editingCap ? (
              <div className="flex items-center gap-1.5">
                <Input
                  className="h-7 w-28 text-xs px-2"
                  placeholder="e.g. 30000"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  autoFocus
                />
                <Button size="sm" className="h-7 text-xs px-2 bg-orange-500" onClick={handleSaveCap}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingCap(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold text-orange-600 hover:text-orange-700 p-1"
                onClick={() => setEditingCap(true)}
              >
                Set Spend Cap →
              </Button>
            )}
          </div>
        </div>

        {/* Culprit Warning Banner (If Over Budget) */}
        {isOverBudget && breakdown.overageCulprits.length > 0 && (
          <div className="rounded-xl p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
              <TrendingDown className="h-4 w-4" />
              <span>Primary Cost Culprits:</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
              {breakdown.overageCulprits.map((c) => c.title).join(" and ")} account for the majority of the ₹{breakdown.overageAmount?.toLocaleString("en-IN")} overage. Consider shifting to a lower tier for these components.
            </p>
          </div>
        )}
      </div>

      {/* Line Items List */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Itemized Breakdown</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-slate-500 gap-1 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            <span>{expanded ? "Collapse Details" : "Expand All"}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        <div className="space-y-2">
          {breakdown.lines.map((item) => {
            const midpoint = Math.round((item.amountMin + item.amountMax) / 2);
            const percentOfTotal = Math.round((midpoint / breakdown.expectedTotal) * 100);

            return (
              <div
                key={item.id}
                className={`rounded-xl p-3 border transition-all ${
                  item.isCulpritOverBudget
                    ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                    : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      {CATEGORY_ICONS[item.category] || <Sparkles className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{item.title}</span>
                        {item.status === "confirmed" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                            Confirmed
                          </Badge>
                        )}
                        {item.isCulpritOverBudget && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/40 text-rose-600 bg-rose-500/10">
                            High Share
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.details}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      ₹{item.amountMin.toLocaleString("en-IN")} – ₹{item.amountMax.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      ~{percentOfTotal}% of total
                    </div>
                  </div>
                </div>

                {/* Expanded Source Details */}
                {expanded && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Source: {item.source}</span>
                    <span className="italic">Status: {item.status}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
