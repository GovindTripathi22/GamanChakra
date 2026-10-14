"use client";

import { useState, useEffect } from "react";
import type { ScheduleGap, GapDealOption } from "@/types/trip";
import { getNearbyGapDeals } from "@/actions/gap-filler";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Footprints,
  Sparkles,
  Plus,
  Tag,
  ChevronDown,
  ChevronUp,
  MapPin,
  Loader2,
  Check,
} from "lucide-react";

interface GapFillCardProps {
  gap: ScheduleGap;
  destination: string;
  onAddDeal: (gap: ScheduleGap, deal: GapDealOption) => void;
}

export function GapFillCard({
  gap,
  destination,
  onAddDeal,
}: GapFillCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [deals, setDeals] = useState<GapDealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDeals() {
      try {
        setLoading(true);
        const results = await getNearbyGapDeals({
          lat: gap.anchorCoordinates.lat,
          lng: gap.anchorCoordinates.lng,
          durationMinutes: gap.durationMinutes,
          destination,
        });
        if (isMounted) {
          setDeals(results);
        }
      } catch (err) {
        console.error("Failed to load gap deals:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadDeals();
    return () => {
      isMounted = false;
    };
  }, [gap, destination]);

  const handleSelect = (deal: GapDealOption) => {
    setAddingId(deal.id);
    setTimeout(() => {
      onAddDeal(gap, deal);
    }, 250);
  };

  return (
    <div className="relative my-4 rounded-2xl border-2 border-dashed border-orange-300/80 bg-gradient-to-r from-orange-50/50 via-amber-50/30 to-orange-50/20 p-4 transition-all hover:border-orange-400 dark:border-orange-500/40 dark:from-orange-950/20 dark:via-slate-900/40 dark:to-orange-950/10">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/20">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Free Buffer Detected
              </span>
              <Badge className="bg-orange-500/10 text-orange-700 border-none dark:bg-orange-500/20 dark:text-orange-300 font-semibold text-[11px] px-2 py-0">
                {gap.durationMinutes} mins free
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {gap.startTime} – {gap.endTime} • Near {gap.anchorLocationName || destination}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-orange-700 hover:text-orange-800 hover:bg-orange-100/60 dark:text-orange-300 dark:hover:bg-orange-950/40 text-xs gap-1 h-8 px-2.5 rounded-full"
        >
          <span>{isOpen ? "Hide Options" : "View Recommendations"}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Expandable recommendations body */}
      {isOpen && (
        <div className="mt-4 pt-3 border-t border-orange-200/60 dark:border-orange-500/20">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-800/80 dark:text-orange-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Instant-Access Off-Peak Perks Nearby
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Within walking radius (&le; 1.5 km)
            </span>
          </div>

          {loading ? (
            <div className="flex h-28 items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              <span>Scanning immediate off-peak availability...</span>
            </div>
          ) : deals.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No off-peak deals currently available for this gap window.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal) => {
                const isSelected = addingId === deal.id;
                return (
                  <div
                    key={deal.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-orange-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-orange-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="space-y-2">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium capitalize"
                        >
                          {deal.category}
                        </Badge>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5" />
                          Save {deal.discountPercent}%
                        </Badge>
                      </div>

                      {/* Title & Desc */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors line-clamp-1">
                          {deal.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {deal.description}
                        </p>
                      </div>

                      {/* Location & Walking time */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Footprints className="h-3 w-3 text-orange-500" />
                          {deal.walkTimeMinutes} min walk
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {deal.durationMinutes} mins
                        </span>
                      </div>

                      {/* Perk tag */}
                      {deal.offPeakTip && (
                        <div className="rounded-lg bg-orange-50/60 dark:bg-orange-950/30 p-1.5 text-[10px] text-orange-800 dark:text-orange-300 font-medium">
                          ✨ {deal.offPeakTip}
                        </div>
                      )}
                    </div>

                    {/* Bottom CTA & Price */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">
                          Off-Peak Rate
                        </span>
                        <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400">
                          {deal.price.currency}
                          {deal.price.amount}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        disabled={isSelected}
                        onClick={() => handleSelect(deal)}
                        className={`h-7 px-3 text-xs font-semibold rounded-full transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" /> Add to Plan
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
