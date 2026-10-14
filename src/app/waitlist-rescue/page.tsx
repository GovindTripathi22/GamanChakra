"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Train,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Bus,
  Car,
  Bell,
  CheckCircle2,
  Calendar,
  Search,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { predictWaitlistAction, monitorPnrAction, bookBackupOptionAction } from "@/actions/waitlist-rescue";
import type { WaitlistPredictionResult, WaitlistAlternative } from "@/types/waitlist";
import { TrustBadge } from "@/components/trust/trust-badge";

const PRESET_SEARCHES = [
  { trainNumber: "12056", className: "CC", wl: 6, label: "12056 Jan Shatabdi (CC WL 6)" },
  { trainNumber: "12051", className: "2A", wl: 28, label: "12051 Madgaon Express (2A WL 28)" },
  { trainNumber: "12952", className: "3A", wl: 14, label: "12952 Mumbai Rajdhani (3A WL 14)" },
  { trainNumber: "22436", className: "CC", wl: 35, label: "22436 Vande Bharat (CC WL 35)" },
];

export default function WaitlistRescuePage() {
  const [trainNumber, setTrainNumber] = useState("12051");
  const [pnr, setPnr] = useState("");
  const [travelClass, setTravelClass] = useState("2A");
  const [waitlistNumber, setWaitlistNumber] = useState("28");
  const [travelDate, setTravelDate] = useState("2026-10-25");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WaitlistPredictionResult | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorSuccess, setMonitorSuccess] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setBookingSuccess(null);
    setMonitorSuccess(null);

    try {
      const res = await predictWaitlistAction({
        pnr: pnr || undefined,
        trainNumber,
        travelClass,
        waitlistNumber: parseInt(waitlistNumber, 10) || 8,
        travelDate,
      });
      setResult(res);
    } catch (err) {
      console.error("Prediction failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_SEARCHES[0]) => {
    setTrainNumber(preset.trainNumber);
    setTravelClass(preset.className);
    setWaitlistNumber(preset.wl.toString());
  };

  const handleMonitorPnr = async () => {
    setIsMonitoring(true);
    try {
      const pnrId = pnr || `PNR-${trainNumber}-${waitlistNumber}`;
      const res = await monitorPnrAction(pnrId);
      setMonitorSuccess(res.message);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMonitoring(false);
    }
  };

  const handleBookBackup = async (opt: WaitlistAlternative) => {
    try {
      const res = await bookBackupOptionAction("standalone_trip", opt);
      setBookingSuccess(`Backup Secured: "${opt.title}". Confirmation policy authorized!`);
    } catch (err: any) {
      alert(`Booking error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold">
            <Train className="h-3.5 w-3.5" />
            <span>Indian Railways Waitlist Rescue (F4)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Predict Waitlist Odds & Deploy Plan B
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Never get stranded by an unconfirmed ticket. Predict confirmation probability with historical quota outcome data and secure backup alternatives before chart preparation.
          </p>
        </div>

        {/* Input Form Card */}
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handlePredict} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Train Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Train Number / Name
                </label>
                <div className="relative">
                  <Train className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 h-10 text-xs font-semibold"
                    placeholder="e.g. 12056"
                    value={trainNumber}
                    onChange={(e) => setTrainNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Class */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Travel Class
                </label>
                <Select value={travelClass} onValueChange={setTravelClass}>
                  <SelectTrigger className="h-10 text-xs font-semibold">
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1A">1A (AC First)</SelectItem>
                    <SelectItem value="2A">2A (AC 2 Tier)</SelectItem>
                    <SelectItem value="3A">3A (AC 3 Tier)</SelectItem>
                    <SelectItem value="CC">CC (AC Chair Car)</SelectItem>
                    <SelectItem value="SL">SL (Sleeper)</SelectItem>
                    <SelectItem value="2S">2S (Second Sitting)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Waitlist Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current Waitlist #
                </label>
                <Input
                  type="number"
                  min="1"
                  className="h-10 text-xs font-semibold"
                  placeholder="e.g. 8"
                  value={waitlistNumber}
                  onChange={(e) => setWaitlistNumber(e.target.value)}
                  required
                />
              </div>

              {/* Journey Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Journey Date
                </label>
                <Input
                  type="date"
                  className="h-10 text-xs font-semibold"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Optional PNR & Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400">Optional PNR:</span>
                <Input
                  className="h-8 w-44 text-xs font-mono"
                  placeholder="10-digit PNR"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto h-10 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {isLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Calculating Probability...
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5 mr-2" />
                    Calculate Confirmation Probability
                  </>
                )}
              </Button>
            </div>

            {/* Sample Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              <span>Quick Test Presets:</span>
              {PRESET_SEARCHES.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </form>
        </Card>

        {/* Prediction Results Display */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Main Probability Meter Card */}
            <Card
              className={`p-6 border transition-all ${
                result.confirmationProbability >= 70
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                  : result.confirmationProbability >= 45
                  ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                  : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
              }`}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <Badge
                      className={`text-xs font-bold px-2.5 py-0.5 ${
                        result.confirmationProbability >= 70
                          ? "bg-emerald-500 text-white"
                          : result.confirmationProbability >= 45
                          ? "bg-amber-500 text-white"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {result.confidenceLabel}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {result.travelClass} • WL#{result.waitlistNumber}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {result.trainName} ({result.trainNumber})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {result.originStation} → {result.destinationStation} on{" "}
                    <strong>{result.travelDate}</strong>
                  </p>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <div>Basis: {result.basis.historicalClearanceRate}</div>
                    <div>Seasonality: {result.basis.seasonalityFactor}</div>
                    <div>Final Charting: {result.basis.chartingTime}</div>
                  </div>
                </div>

                {/* Probability Score Pill */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-w-[200px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Confirmation Chance
                  </span>
                  <div
                    className={`text-4xl font-extrabold ${
                      result.confirmationProbability >= 70
                        ? "text-emerald-600 dark:text-emerald-400"
                        : result.confirmationProbability >= 45
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {result.confirmationProbability}%
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Based on {result.basis.sampleSize} verified outcomes
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 text-[11px] h-7 w-full font-semibold gap-1.5"
                    onClick={handleMonitorPnr}
                    disabled={isMonitoring}
                  >
                    <Bell className="h-3 w-3 text-orange-500" />
                    Monitor this PNR
                  </Button>
                </div>
              </div>

              {monitorSuccess && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{monitorSuccess}</span>
                </div>
              )}
            </Card>

            {/* Rescue Plan B Section (Shown when probability < 60%) */}
            {result.isRescueNeeded && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/40">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Waitlist Rescue Plan B Deployed
                    </h3>
                    <p className="text-xs text-slate-500">
                      Odds are under 60%. Lock in verified backup travel before seats run out.
                    </p>
                  </div>
                </div>

                {bookingSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 border border-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{bookingSuccess}</span>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {result.alternatives.map((alt) => (
                    <Card
                      key={alt.id}
                      className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-800 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {alt.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold px-2 py-0 border-orange-500/40 text-orange-600 bg-orange-50 dark:bg-orange-950/40"
                          >
                            {alt.badge}
                          </Badge>
                        </div>

                        <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                          <span>{alt.operator}</span>
                          {alt.duration && <span>• {alt.duration}</span>}
                        </div>

                        {alt.tatkalOpenTime && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>Opens: {alt.tatkalOpenTime}</span>
                          </div>
                        )}

                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-xs text-slate-400">Estimated Cost:</span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            ₹{alt.estimatedPrice.amount.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <p className="text-[11px] text-orange-600 dark:text-orange-400 italic font-medium">
                          Trade-off: {alt.tradeOff}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        className="w-full h-8 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm gap-1.5"
                        onClick={() => handleBookBackup(alt)}
                      >
                        <span>{alt.actionLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <TrustBadge provenance={result.provenance} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
