"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Umbrella,
  Users,
} from "lucide-react";
import type { DisruptionAnalysisResult, RecoveryOption, Activity } from "@/types/trip";

interface RecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DisruptionAnalysisResult | null;
  isLoading: boolean;
  onExecuteRecovery: (option: RecoveryOption) => void;
}

export function RecoveryDialog({
  isOpen,
  onClose,
  analysis,
  isLoading,
  onExecuteRecovery,
}: RecoveryDialogProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSelected = analysis?.options.find((o) =>
    selectedOptionId ? o.id === selectedOptionId : true
  ) || analysis?.options[0];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">Critical Impact</Badge>;
      case "moderate":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Moderate Delay</Badge>;
      default:
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Minor Alert</Badge>;
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case "reorder":
        return <RefreshCw className="h-4 w-4 text-emerald-500" />;
      case "substitute":
        return <Umbrella className="h-4 w-4 text-indigo-500" />;
      case "buffer_relax":
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-orange-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Zap className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Autonomous Travel Control Tower
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Self-healing execution engine resolving live travel disruptions & schedule collisions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-orange-500/20"></div>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Analyzing cascading schedule impacts & re-routing timeline...
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Querying live capacity thresholds and off-peak alternatives
            </p>
          </div>
        ) : analysis ? (
          <div className="space-y-6 pt-2">
            {/* Disruption Event Banner */}
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {analysis.disruption.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {analysis.disruption.description}
                    </p>
                  </div>
                </div>
                {getSeverityBadge(analysis.disruption.severity)}
              </div>

              {/* Cascading Failures List */}
              {analysis.cascadingFailures && analysis.cascadingFailures.length > 0 && (
                <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40">
                  <p className="text-[11px] font-semibold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                    Cascading Schedule Failures Identified:
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {analysis.cascadingFailures.map((failure, idx) => (
                      <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        {failure}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recovery Strategies Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Autonomous Recovery Proposals ({analysis.options.length})
                </h4>
                <span className="text-xs text-slate-400">Select a proposal to execute</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.options.map((option) => {
                  const isSelected = currentSelected?.id === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? "border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20 shadow-md"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                            {getStrategyIcon(option.strategy)}
                            {option.badgeText}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            {option.confidenceScore}% match
                          </Badge>
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 mb-1">
                          {option.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3">
                          {option.explanation}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Cost:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {option.costDelta.amount > 0
                            ? `+${option.costDelta.currency}${option.costDelta.amount}`
                            : "No extra cost"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Strategy Deep Dive & Timeline Preview */}
            {currentSelected && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Plan Summary: {currentSelected.title}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {currentSelected.explanation}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-3">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Reflowed Timeline Preview ({currentSelected.updatedActivities.length} steps):
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {currentSelected.updatedActivities.map((act: Activity, idx: number) => (
                      <div
                        key={act.id || idx}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-100/60 dark:bg-slate-800/40"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                          {idx + 1}. {act.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {act.startTime} - {act.endTime}
                          </span>
                          {act.isGapFiller && (
                            <Badge className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400 py-0 px-1 border-0">
                              Pivot
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  <strong>Trade-off analysis:</strong> {currentSelected.tradeOffSummary}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Dismiss
              </Button>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 shadow-md hover:shadow-orange-500/20"
                onClick={() => {
                  if (currentSelected) {
                    onExecuteRecovery(currentSelected);
                  }
                }}
              >
                <Zap className="h-4 w-4" />
                Execute Autonomous Healing
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
