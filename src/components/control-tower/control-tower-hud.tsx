"use client";

import { useState } from "react";
import {
  Zap,
  ShieldCheck,
  Activity as ActivityIcon,
  AlertTriangle,
  PlayCircle,
  Settings2,
  ChevronDown,
  CloudRain,
  Train,
  Users,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRESET_DISRUPTIONS } from "@/lib/disruption-simulator";
import type { DisruptionEvent, ControlTowerStatus } from "@/types/trip";

interface ControlTowerHudProps {
  tripHealthScore?: number;
  guardianMode: "copilot" | "autonomous";
  onToggleGuardianMode: () => void;
  onTriggerDisruption: (preset: DisruptionEvent) => void;
  isSimulating: boolean;
  activeDisruptionCount?: number;
}

export function ControlTowerHud({
  tripHealthScore = 96,
  guardianMode,
  onToggleGuardianMode,
  onTriggerDisruption,
  isSimulating,
  activeDisruptionCount = 0,
}: ControlTowerHudProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_DISRUPTIONS[0].id);

  const selectedPreset =
    PRESET_DISRUPTIONS.find((p) => p.id === selectedPresetId) || PRESET_DISRUPTIONS[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Sentinel Status & Radar */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <ActivityIcon className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                Voyage Autonomous Control Tower
              </h3>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                Sentinel Live
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Trip Health: <strong className="text-emerald-600 dark:text-emerald-400">{tripHealthScore}% Optimal</strong></span>
              <span>•</span>
              <span>Active Sentinel: <strong className="text-slate-700 dark:text-slate-300">Continuous Monitoring</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Guardian Mode & Simulation Console */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Guardian Mode Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleGuardianMode}
            className="text-xs h-9 font-medium border-slate-200 dark:border-slate-800 flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
            Mode:{" "}
            <span className="font-bold text-slate-900 dark:text-white capitalize">
              {guardianMode === "copilot" ? "Copilot (Review)" : "Autonomous"}
            </span>
          </Button>

          {/* Preset Selector */}
          <div className="flex items-center gap-1.5">
            <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
              <SelectTrigger className="w-[180px] sm:w-[210px] h-9 text-xs border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Select disruption..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_DISRUPTIONS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} className="text-xs">
                    {preset.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Simulate Button */}
            <Button
              size="sm"
              disabled={isSimulating}
              onClick={() => onTriggerDisruption(selectedPreset)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 flex items-center gap-1.5 shadow-sm"
            >
              {isSimulating ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Simulate Incident</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
