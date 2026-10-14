"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Hotel,
  Bus,
  Car,
  Plane,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Tag,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { getListingsAction, createHoldAction, confirmReservationAction } from "@/actions/exchange";

export default function LiquidityExchangePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState("all");
  const [activeHold, setActiveHold] = useState<any | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<any | null>(null);

  useEffect(() => {
    loadListings();
  }, [selectedDestination]);

  useEffect(() => {
    if (holdSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        if (prev <= 1) {
          setActiveHold(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [holdSecondsLeft]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await getListingsAction(selectedDestination);
      setListings(data);
    } catch (e) {
      console.error("Failed to load listings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async (listingId: string) => {
    try {
      const res = await createHoldAction(listingId);
      setActiveHold(res.hold);
      setHoldSecondsLeft(15 * 60);
      setConfirmedReservation(null);
      await loadListings();
    } catch (err: any) {
      alert(err.message || "Failed to place inventory hold.");
    }
  };

  const handleConfirmReservation = async () => {
    if (!activeHold) return;
    setConfirming(true);
    try {
      const res = await confirmReservationAction(activeHold.id);
      setConfirmedReservation(res);
      setActiveHold(null);
      setHoldSecondsLeft(0);
      await loadListings();
    } catch (err: any) {
      alert(err.message || "Failed to confirm reservation.");
    } finally {
      setConfirming(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "stay":
        return Hotel;
      case "transit_bus":
        return Bus;
      case "transit_cab":
        return Car;
      default:
        return Plane;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Store className="h-3.5 w-3.5" /> Breakthrough 3: KLYP Travel Liquidity Exchange
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              B2B Travel Liquidity Exchange
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Verified supplier inventory with expiring 15-minute atomic holds, oversell prevention, and verifiable sandbox reservations.
            </p>
          </div>

          {/* Active Hold Banner if holding */}
          {activeHold && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider block">
                  Active 15-Minute Inventory Hold
                </span>
                <span className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">
                  {Math.floor(holdSecondsLeft / 60)}:{(holdSecondsLeft % 60).toString().padStart(2, "0")} remaining
                </span>
              </div>
              <button
                onClick={handleConfirmReservation}
                disabled={confirming}
                className="ml-auto px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50 transition-colors"
              >
                {confirming ? "Confirming..." : "Confirm Reservation"}
              </button>
            </div>
          )}
        </div>

        {/* Confirmed Reservation Banner */}
        {confirmedReservation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                  Sandbox Reservation Confirmed!
                </h3>
                <span className="text-xs text-emerald-700 dark:text-emerald-300">
                  Booking Reference: <strong className="font-mono text-emerald-950 dark:text-emerald-100">{confirmedReservation.bookingRef}</strong> • Total: ₹{confirmedReservation.totalAmountINR.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold uppercase px-3 py-1 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 self-start sm:self-auto">
              [Sandbox Verified]
            </span>
          </motion.div>
        )}

        {/* Listings Filter & Grid */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-500" /> Available Inventory Listings ({listings.length})
            </h2>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              {["all", "Goa", "Jaipur"].map((dest) => (
                <button
                  key={dest}
                  onClick={() => setSelectedDestination(dest)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedDestination === dest
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {dest === "all" ? "All Destinations" : dest}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((l) => {
                const IconComponent = getCategoryIcon(l.category);
                const isOutOfStock = l.unitsAvailable <= 0;

                return (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {l.destination}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {l.title}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          Supplier: {l.supplier?.name} (★ {l.supplier?.rating})
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {l.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            ₹{l.unitPriceINR.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1">/ unit</span>
                        </div>

                        <span className={`text-xs font-bold ${isOutOfStock ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {isOutOfStock ? "Sold Out" : `${l.unitsAvailable} left`}
                        </span>
                      </div>

                      <button
                        onClick={() => handleHold(l.id)}
                        disabled={isOutOfStock || activeHold !== null}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-40 transition-colors"
                      >
                        {isOutOfStock ? "Unavailable" : activeHold ? "Hold in Progress" : "Place 15-Min Hold"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
