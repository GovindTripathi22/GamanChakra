"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  IndianRupee,
  Hotel,
  SunMedium,
  CheckCircle2,
  Compass,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Share2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TRENDING_TRIPS,
  TRENDING_THEMES,
  TrendingTrip,
} from "@/lib/inspire/trending-trips";

export default function InspirePage() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [activeModalTrip, setActiveModalTrip] = useState<TrendingTrip | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spotlightedTripId, setSpotlightedTripId] = useState<string | null>(null);

  const filteredTrips =
    selectedTheme === "all"
      ? TRENDING_TRIPS
      : TRENDING_TRIPS.filter((t) => t.theme === selectedTheme);

  // Surprise Me / Roulette Action
  const handleInspireMeNow = () => {
    setIsSpinning(true);
    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * TRENDING_TRIPS.length);
      setSpotlightedTripId(TRENDING_TRIPS[randomIndex].id);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        setIsSpinning(false);
        const chosen = TRENDING_TRIPS[Math.floor(Math.random() * TRENDING_TRIPS.length)];
        setSpotlightedTripId(chosen.id);
        setActiveModalTrip(chosen);
      }
    }, 120);

    // Scroll to the trending section smoothly
    const gridEl = document.getElementById("trending-grid");
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLaunchTrip = (trip: TrendingTrip) => {
    const params = new URLSearchParams({
      destination: trip.destination,
      days: trip.days.toString(),
      budget: trip.budgetTier.toLowerCase(),
      vibe: trip.vibe,
      includeTravelDays: "yes",
    });
    router.push(`/generate?${params.toString()}`);
  };

  const handleCustomizeInWizard = (trip: TrendingTrip) => {
    const params = new URLSearchParams({
      destination: trip.destination,
      days: trip.days.toString(),
      budget: trip.budgetTier.toLowerCase(),
      vibe: trip.vibe,
    });
    router.push(`/create-trip?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 pb-28">
      {/* Hero Banner with Dark Contrast Overlay */}
      <div className="relative min-h-[62vh] w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-black/65 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/40 to-black/75 z-10 pointer-events-none" />
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
          alt="Voyage Inspiration"
          className="h-full w-full object-cover absolute inset-0 scale-105"
        />

        <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 py-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1.5 backdrop-blur-md border border-orange-500/40 text-orange-200">
              <Sparkles className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Voyage Curated Inspiration
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              Let the World <span className="text-orange-500">Surprise You</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Not sure where to venture next? Explore handpicked trending locations with fully-crafted day-by-day itineraries, real hotels, and instant AI travel generation.
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                onClick={handleInspireMeNow}
                disabled={isSpinning}
                className="h-14 px-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-base shadow-xl shadow-orange-500/30 hover:scale-105 transition-all cursor-pointer gap-2"
              >
                <Sparkles className={`h-5 w-5 ${isSpinning ? "animate-spin" : ""}`} />
                <span>{isSpinning ? "Selecting Ideal Destination..." : "Inspire Me Now (Surprise Trip)"}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const el = document.getElementById("trending-grid");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-14 px-8 rounded-full border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold text-base backdrop-blur-md transition-all cursor-pointer"
              >
                <span>Browse Themed Trips</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div id="trending-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-12">
        {/* Section Header & Theme Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">
              <Compass className="h-4 w-4" />
              <span>Trending Destinations & Complete Itineraries</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Curated Escapes by Travel Theme
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Each destination comes with complete day-by-day activities, estimated budgets, and verified hotels.
            </p>
          </div>

          {/* Theme Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {TRENDING_THEMES.map((theme) => {
              const isActive = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-800"
                  }`}
                >
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trending Destinations Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredTrips.map((trip) => {
            const isSpotlighted = spotlightedTripId === trip.id;
            const isExpanded = expandedTripId === trip.id;

            return (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`group rounded-3xl bg-white dark:bg-slate-900 border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                  isSpotlighted
                    ? "ring-2 ring-orange-500 border-orange-500"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* Card Top: Imagery & Badges */}
                <div>
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={trip.imageUrl}
                      alt={trip.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/30" />

                    {/* Top Left Theme Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                        <span>{trip.themeIcon}</span>
                        <span>{trip.themeLabel}</span>
                      </span>
                    </div>

                    {/* Top Right Duration Pill */}
                    <div className="absolute top-4 right-4">
                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-extrabold text-white shadow-md">
                        {trip.days} Days · Full Itinerary
                      </span>
                    </div>

                    {/* Bottom Image Overlay Details */}
                    <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{trip.destination}</span>
                        <span>•</span>
                        <span>Best: {trip.bestSeason}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                        {trip.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-6">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {trip.tagline}
                    </p>

                    {/* Key Stats Bar */}
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">EST. BUDGET</span>
                        <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                          ₹{trip.estimatedBudgetINR.toLocaleString("en-IN")}
                        </strong>
                        <span className="text-[10px] text-slate-400 block">{trip.budgetTier} Tier</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">TRIP VIBE</span>
                        <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {trip.vibe}
                        </strong>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Verified Safe</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">STAY TIER</span>
                        <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {trip.recommendedHotels[0]?.name.split(" ")[0]} & more
                        </strong>
                        <span className="text-[10px] text-orange-500 font-semibold">Real Hotels</span>
                      </div>
                    </div>

                    {/* Signature Highlights */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                        <span>Curated Highlights Included</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {trip.highlights.slice(0, 3).map((hl, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Inline Accordion Day-by-Day Itinerary Preview */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                        className="w-full flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 py-1 cursor-pointer"
                      >
                        <span>
                          {isExpanded ? "Hide Day-by-Day Schedule" : `Preview All ${trip.days} Days Itinerary`}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2.5 pt-3 overflow-hidden text-xs"
                          >
                            {trip.itinerary.map((d) => (
                              <div
                                key={d.day}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <strong className="text-slate-900 dark:text-white">
                                    Day {d.day}: {d.title}
                                  </strong>
                                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40">
                                    {d.theme}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Highlight:</span> {d.highlight}
                                </p>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Recommended Real Hotels Preview */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
                          <Hotel className="h-3 w-3 text-orange-500" />
                          <span>Curated Real Accommodations</span>
                        </span>
                        <span>{trip.recommendedHotels.length} options</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {trip.recommendedHotels.slice(0, 2).map((h, hIdx) => (
                          <div
                            key={hIdx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                          >
                            <div className="truncate pr-2">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {h.name}
                              </div>
                              <div className="text-[10px] text-slate-400 capitalize">
                                {h.tier} • ★ {h.rating}
                              </div>
                            </div>
                            <span className="text-[11px] font-extrabold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                              {h.price.split("/")[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Bottom Bar */}
                <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    onClick={() => handleLaunchTrip(trip)}
                    className="w-full sm:flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Generate Full AI Trip</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setActiveModalTrip(trip)}
                    className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span>View Schedule</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => handleCustomizeInWizard(trip)}
                    title="Customize details in step-by-step wizard"
                    className="w-full sm:w-auto h-11 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <span>Customize</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Full Trip Itinerary Modal Dialog */}
      <Dialog open={!!activeModalTrip} onOpenChange={(open) => !open && setActiveModalTrip(null)}>
        {activeModalTrip && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader className="sr-only">
              <DialogTitle>{activeModalTrip.title}</DialogTitle>
              <DialogDescription>{activeModalTrip.tagline}</DialogDescription>
            </DialogHeader>

            {/* Modal Header Cover */}
            <div className="relative h-56 w-full overflow-hidden">
              <img
                src={activeModalTrip.imageUrl}
                alt={activeModalTrip.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/10">
                  {activeModalTrip.themeIcon} {activeModalTrip.themeLabel}
                </span>
              </div>
              <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
                <div className="text-xs font-semibold text-orange-400">
                  {activeModalTrip.days} Days • Est. ₹{activeModalTrip.estimatedBudgetINR.toLocaleString("en-IN")} • {activeModalTrip.vibe}
                </div>
                <h3 className="text-2xl font-extrabold text-white drop-shadow-md">
                  {activeModalTrip.title}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Trip Overview</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-1">
                  {activeModalTrip.overview}
                </p>
              </div>

              {/* Day-by-Day Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span>Full Day-by-Day Schedule ({activeModalTrip.days} Days)</span>
                </h4>

                <div className="space-y-4">
                  {activeModalTrip.itinerary.map((d) => (
                    <div
                      key={d.day}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          Day {d.day}: {d.title}
                        </span>
                        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 w-fit">
                          {d.theme}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">🌅 Morning</span>
                          <p>{d.morning}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">☀️ Afternoon</span>
                          <p>{d.afternoon}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">🌙 Evening</span>
                          <p>{d.evening}</p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs text-orange-900 dark:text-orange-200 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-orange-500 shrink-0" />
                        <span><strong>Signature Highlight:</strong> {d.highlight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Hotels in Modal */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-orange-500" />
                  <span>Curated Accommodations in {activeModalTrip.destination}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeModalTrip.recommendedHotels.map((h, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 space-y-1"
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {h.name}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {h.tier} Tier • ★ {h.rating}
                      </div>
                      <div className="text-xs font-extrabold text-orange-600 dark:text-orange-400 pt-1">
                        {h.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={() => handleLaunchTrip(activeModalTrip)}
                  className="w-full sm:flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer gap-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Generate This Exact Trip Now</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleCustomizeInWizard(activeModalTrip)}
                  className="w-full sm:w-auto h-12 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700"
                >
                  <span>Customize in Wizard</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
