"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    MapPin,
    Calendar,
    Wallet,
    Sparkles,
    Trash2,
    ArrowRight,
    Activity,
    ShieldCheck,
    TrendingUp,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { GeneratedTrip } from "@/types/trip";
import { getGlobalTelemetryStats } from "@/lib/outcome-ledger";
import { getUserTripsFromDatabase, saveTripToDatabase, getTripFromDatabase } from "@/actions/trip-persistence";

interface SavedTrip extends GeneratedTrip {
    id: string;
    createdAt: number;
}

export default function MyTripsPage() {
    const router = useRouter();
    const [trips, setTrips] = useState<SavedTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [telemetry, setTelemetry] = useState({
        totalTrackedSteps: 142,
        predictionAccuracy: 92.4,
        averageDelayMinutes: 14.2,
        shieldClaimsPaid: 18,
        totalShieldPayoutAmount: 27000,
    });

    useEffect(() => {
        const loadTrips = async () => {
            const loadedTrips: SavedTrip[] = [];
            const processedIds = new Set<string>();

            // 1. Fetch persistent trips from SQLite/Postgres DB
            try {
                const dbTrips = await getUserTripsFromDatabase();
                for (const dt of dbTrips) {
                    const fullTrip = await getTripFromDatabase(dt.id);
                    if (fullTrip) {
                        loadedTrips.push({
                            ...fullTrip,
                            id: `trip_${dt.id}`,
                            createdAt: new Date(dt.createdAt).getTime(),
                        });
                        processedIds.add(dt.id);
                        processedIds.add(`trip_${dt.id}`);
                    }
                }
            } catch (err) {
                console.error("Failed to load trips from DB:", err);
            }

            // 2. Read local storage trips and auto-migrate any unsaved local trips to the DB
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("trip_") && !processedIds.has(key)) {
                    try {
                        const tripData = JSON.parse(localStorage.getItem(key) || "");
                        const cleanId = key.replace("trip_", "");
                        if (!processedIds.has(cleanId)) {
                            const timestamp = parseInt(cleanId, 10) || Date.now();
                            loadedTrips.push({ ...tripData, id: key, createdAt: timestamp });
                            // Silently sync to database
                            saveTripToDatabase(tripData, cleanId).catch(() => {});
                        }
                    } catch (e) {
                        console.error("Failed to parse trip", key, e);
                    }
                }
            }

            setTrips(loadedTrips.sort((a, b) => b.createdAt - a.createdAt));
            setTelemetry(getGlobalTelemetryStats());
            setLoading(false);
        };

        loadTrips();
    }, []);

    const deleteTrip = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this trip?")) {
            localStorage.removeItem(id);
            setTrips(prev => prev.filter(t => t.id !== id));
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-pulse text-xl text-slate-400">Loading your live journeys...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 text-xs">
                                KLYP Execution Engine
                            </Badge>
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Telemetry Active
                            </Badge>
                        </div>
                        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">
                            My <span className="text-orange-500">Trips</span>
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                            Monitor real-time journey health, execute autonomous self-healing, and track outcome telemetry.
                        </p>
                    </div>
                    <Link href="/create-trip">
                        <Button className="bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25">
                            + Plan New Trip
                        </Button>
                    </Link>
                </div>

                {/* KLYP Global Telemetry Banner */}
                <div className="mb-10 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-800/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-orange-500" />
                            KLYP Ground-Truth Outcome Ledger (Proprietary Dataset)
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Self-Improving World Model
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Tracked Live Steps</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {telemetry.totalTrackedSteps}
                            </p>
                            <p className="text-[10px] text-emerald-600 mt-0.5">Real-world telemetry</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Prediction Accuracy</p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {telemetry.predictionAccuracy}%
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Crowd & delay models</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Avg. Delay Absorption</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {telemetry.averageDelayMinutes}m
                            </p>
                            <p className="text-[10px] text-orange-500 mt-0.5">Auto-healed by agent</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-400">Shield Claims Settled</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                ₹{telemetry.totalShieldPayoutAmount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-emerald-600 mt-0.5">Instant UPI payouts</p>
                        </div>
                    </div>
                </div>

                {trips.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-20 text-center"
                    >
                        <div className="mb-6 rounded-full bg-orange-50 dark:bg-orange-500/20 p-6">
                            <MapPin className="h-12 w-12 text-orange-500" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">No trips saved yet</h3>
                        <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
                            You haven't generated any trips yet. Start your journey by creating your first AI-powered itinerary!
                        </p>
                        <Link href="/create-trip">
                            <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600">
                                Create Your First Trip
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {trips.map((trip, index) => (
                            <Link href={`/trip/${trip.id.replace("trip_", "")}`} key={trip.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative h-full overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
                                >
                                    {/* Card Header / Image Placeholder */}
                                    <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                        <img
                                            src={`https://source.unsplash.com/800x600/?${encodeURIComponent(trip.trip_details?.destination || "travel")}`}
                                            alt={trip.trip_details?.destination}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";
                                            }}
                                        />
                                        <div className="absolute top-4 right-4">
                                            <button
                                                onClick={(e) => deleteTrip(e, trip.id)}
                                                className="rounded-full bg-white/90 dark:bg-slate-900/90 p-2 text-red-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                                                title="Delete Trip"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                                                {trip.trip_details?.vibe}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-6">
                                        <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white line-clamp-1">
                                            {trip.trip_details?.destination}
                                        </h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                <Calendar className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.duration}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                <Wallet className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.budget} Budget</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                                <Sparkles className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.total_estimated_cost} Est. Cost</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                <Activity className="h-3.5 w-3.5" />
                                                <span>Control Tower Active</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                                <span>Shielded (₹1.5k)</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                                            <span className="text-xs text-slate-400">
                                                Created {new Date(trip.createdAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center text-sm font-semibold text-orange-500 group-hover:translate-x-1 transition-transform">
                                                Launch Mission Control <ArrowRight className="ml-1 h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
