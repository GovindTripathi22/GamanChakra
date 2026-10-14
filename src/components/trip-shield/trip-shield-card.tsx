"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  IndianRupee,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimTripShieldRefund } from "@/lib/outcome-ledger";
import type { TripShieldClaim } from "@/types/trip";

interface TripShieldCardProps {
  tripId: string;
  destination: string;
}

export function TripShieldCard({ tripId, destination }: TripShieldCardProps) {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [upiId, setUpiId] = useState("traveler@okaxis");
  const [processing, setProcessing] = useState(false);
  const [claimResult, setClaimResult] = useState<TripShieldClaim | null>(null);

  const handleClaim = () => {
    if (!upiId.includes("@")) {
      alert("Please enter a valid UPI ID (e.g., yourname@okhdfcbank)");
      return;
    }

    setProcessing(true);
    setTimeout(() => {
      const claim = claimTripShieldRefund(
        tripId,
        "step-transit-conn",
        `Transit to ${destination}`,
        upiId,
        1500
      );
      setClaimResult(claim);
      setProcessing(false);
    }, 1200);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 dark:border-emerald-500/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Voyage Shield™ — Guaranteed Outcome Protection
              </h4>
              <Badge className="bg-emerald-500 text-white text-[10px] font-semibold">
                Active Policy
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
              Backed by KLYP risk-prediction models: If your train or flight is delayed by &gt;60 mins and breaks your scheduled itinerary, receive an <strong>instant ₹1,500 UPI compensation</strong> with zero claim paperwork.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          onClick={() => {
            setClaimResult(null);
            setClaimModalOpen(true);
          }}
        >
          <Zap className="h-3.5 w-3.5" />
          Simulate Instant UPI Payout
        </Button>
      </div>

      {/* Claim Dialog */}
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Voyage Shield Instant Payout
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Autonomous execution demo: Verifying telemetry lag and dispensing compensation.
            </DialogDescription>
          </DialogHeader>

          {claimResult ? (
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  ₹{claimResult.payoutAmount} Dispatched Instantly!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sent via IMPS/UPI to <strong className="text-slate-700 dark:text-slate-200">{claimResult.upiId}</strong>
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-left text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank UTR Ref:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{claimResult.utrNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trigger:</span>
                  <span className="text-slate-700 dark:text-slate-300">Cascading Delay &gt; 60m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Settled (0.8s)</span>
                </div>
              </div>

              <Button
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs"
                onClick={() => setClaimModalOpen(false)}
              >
                Close & Return to Journey
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Telemetry detected a 75-minute transit lag on your approach route to {destination}. Your Voyage Shield threshold has been triggered.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upi-vpa" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Enter your UPI ID / VPA for instant payout:
                </Label>
                <div className="relative">
                  <Input
                    id="upi-vpa"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi or name@okhdfcbank"
                    className="text-xs pr-10"
                  />
                  <IndianRupee className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Funds settle directly into your linked bank account via NPCI UPI rails.
                </p>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2"
                onClick={handleClaim}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Authorizing UPI Transfer...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    Authorize ₹1,500 Instant Claim
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
