"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Calendar, Wallet, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { GeneratedTrip } from "@/actions/generate-trip";

interface SavedTrip extends GeneratedTrip {
    id: string;
    createdAt: number;
}

export default function MyTripsPage() {
    const router = useRouter();
    const [trips, setTrips] = useState<SavedTrip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTrips = () => {
            const loadedTrips: SavedTrip[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("trip_")) {
                    try {
                        const tripData = JSON.parse(localStorage.getItem(key) || "");
                        // Extract timestamp from key if possible, or use current time as fallback
                        const timestamp = parseInt(key.replace("trip_", "")) || Date.now();
                        loadedTrips.push({ ...tripData, id: key, createdAt: timestamp });
                    } catch (e) {
                        console.error("Failed to parse trip", key, e);
                    }
                }
            }
            // Sort by newest first
            setTrips(loadedTrips.sort((a, b) => b.createdAt - a.createdAt));
            setLoading(false);
        };

        loadTrips();
    }, []);

    const deleteTrip = (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this trip?")) {
            localStorage.removeItem(id);
            setTrips(prev => prev.filter(t => t.id !== id));
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="animate-pulse text-xl text-slate-400">Loading your adventures...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-slate-900 md:text-5xl">
                            My <span className="text-orange-500">Trips</span>
                        </h1>
                        <p className="mt-2 text-lg text-slate-600">
                            Your collection of AI-planned adventures.
                        </p>
                    </div>
                    <Link href="/create-trip">
                        <Button className="bg-orange-500 text-white hover:bg-orange-600">
                            + Plan New Trip
                        </Button>
                    </Link>
                </div>

                {trips.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center"
                    >
                        <div className="mb-6 rounded-full bg-orange-50 p-6">
                            <MapPin className="h-12 w-12 text-orange-500" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-slate-900">No trips saved yet</h3>
                        <p className="mb-8 max-w-md text-slate-500">
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
                                    className="group relative h-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
                                >
                                    {/* Card Header / Image Placeholder */}
                                    <div className="relative h-48 w-full overflow-hidden bg-slate-200">
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
                                                className="rounded-full bg-white/90 p-2 text-red-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600"
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
                                        <h3 className="mb-4 text-xl font-bold text-slate-900 line-clamp-1">
                                            {trip.trip_details?.destination}
                                        </h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <Calendar className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.duration}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <Wallet className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.budget} Budget</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <Sparkles className="h-4 w-4 text-orange-500" />
                                                <span>{trip.trip_details?.total_estimated_cost} Est. Cost</span>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                            <span className="text-xs text-slate-400">
                                                Created {new Date(trip.createdAt).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center text-sm font-medium text-orange-500 group-hover:translate-x-1 transition-transform">
                                                View Itinerary <ArrowRight className="ml-1 h-4 w-4" />
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
