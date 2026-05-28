"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    Calendar,
    Wallet,
    Users,
    Star,
    Clock,
    ArrowLeft,
    Hotel,
    Sparkles,
    Train,
    Bus,
    Plane,
    Car,
    Navigation,
    IndianRupee,
    Share2,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GeneratedTrip } from "@/actions/generate-trip";
import { BudgetEstimator } from "@/components/budget-estimator";
import { WeatherWidget } from "@/components/weather-widget";
import { PdfExportButton } from "@/components/pdf-export-button";
import { MapView } from "@/components/map-view";

export default function TripPage() {
    const params = useParams();
    const router = useRouter();
    const [trip, setTrip] = useState<GeneratedTrip | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState<number | "all">("all");

    useEffect(() => {
        const tripId = params.id as string;
        const storedTrip = localStorage.getItem(`trip_${tripId}`);

        if (storedTrip) {
            setTrip(JSON.parse(storedTrip));
        }
        setLoading(false);
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                        <div className="absolute h-full w-full animate-ping rounded-full bg-orange-500/20"></div>
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent shadow-lg"></div>
                    </div>
                    <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Crafting your itinerary...</p>
                </div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
                <div className="max-w-md text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-full bg-orange-100 p-4 dark:bg-orange-950/30">
                            <MapPin className="h-12 w-12 text-orange-500" />
                        </div>
                    </div>
                    <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Trip Plan Not Found</h1>
                    <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                        This travel plan could not be found. It may have been expired or deleted from your browser storage.
                    </p>
                    <Button onClick={() => router.push("/")} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Create New Trip
                    </Button>
                </div>
            </div>
        );
    }

    // Extract numeric duration
    const durationDays = parseInt(trip.trip_details.duration.split(" ")[0]) || 5;

    const getTransportIcon = (mode: string) => {
        const m = mode.toLowerCase();
        if (m.includes("flight") || m.includes("plane")) return <Plane className="h-5 w-5" />;
        if (m.includes("train") || m.includes("rail")) return <Train className="h-5 w-5" />;
        if (m.includes("bus")) return <Bus className="h-5 w-5" />;
        return <Car className="h-5 w-5" />;
    };

    // Filter displayed days based on selected tab
    const displayedDays = activeDay === "all" 
        ? trip.itinerary 
        : trip.itinerary.filter(d => d.day === activeDay);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
            {/* Hero Banner Section */}
            <div className="relative h-[55vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30 z-10" />
                <img
                    src={`https://image.pollinations.ai/prompt/cinematic%20photo%20of%20${encodeURIComponent(trip.trip_details.destination)}%20famous%20landmark%20sunset%20aesthetic%204k?width=1600&height=900&nologo=true`}
                    alt={trip.trip_details.destination}
                    className="h-full w-full object-cover object-center scale-105 animate-subtle-zoom"
                />
                
                {/* Floating Navigation & Controls */}
                <div className="absolute top-0 left-0 right-0 z-20 flex justify-between p-6 max-w-7xl mx-auto items-center">
                    <Button
                        onClick={() => router.push("/")}
                        variant="outline"
                        className="rounded-full border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Search
                    </Button>
                    <div className="flex gap-2">
                        <PdfExportButton trip={trip} />
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Trip link copied to clipboard!");
                            }}
                            variant="outline"
                            className="rounded-full border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    </div>
                </div>

                {/* Hero Metadata */}
                <div className="absolute bottom-12 left-0 right-0 z-20 max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-3xl space-y-4"
                    >
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600 rounded-full px-3 py-1 font-medium tracking-wide uppercase text-xs">
                            {trip.trip_details.duration} Experience
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white font-sans drop-shadow-md">
                            {trip.trip_details.destination}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/90 text-sm font-medium">
                            <div className="flex items-center gap-1.5">
                                <Wallet className="h-4.5 w-4.5 text-orange-400" />
                                <span className="capitalize">{trip.trip_details.budget} Budget</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="h-4.5 w-4.5 text-orange-400" />
                                <span className="capitalize">{trip.trip_details.vibe} Vibe</span>
                            </div>
                            {trip.trip_details.total_estimated_cost && (
                                <div className="flex items-center gap-1.5">
                                    <IndianRupee className="h-4.5 w-4.5 text-orange-400" />
                                    <span>Est. {trip.trip_details.total_estimated_cost} Total</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Content Section */}
            <div className="mx-auto max-w-7xl px-6 py-12 -mt-10 relative z-30">
                <div className="grid gap-8 lg:grid-cols-3">
                    
                    {/* Left Column: Itinerary Details */}
                    <div className="lg:col-span-2 space-y-12">
                        
                        {/* Getting There Card */}
                        {trip.transportation_plan && trip.transportation_plan.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="rounded-3xl bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 transition-all"
                            >
                                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <div className="rounded-xl bg-orange-100 dark:bg-orange-950/40 p-2.5">
                                        <Navigation className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Getting There</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Your optimized transit routes</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {trip.transportation_plan.map((step, index) => (
                                        <div 
                                            key={index} 
                                            className="flex gap-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-5 transition-all hover:border-orange-100 dark:hover:border-orange-950 hover:shadow-sm"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm text-orange-600 dark:text-orange-400">
                                                {getTransportIcon(step.mode)}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{step.mode}</h3>
                                                    <div className="flex gap-2">
                                                        <Badge variant="secondary" className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs">
                                                            {step.duration}
                                                        </Badge>
                                                        <Badge className="bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-none text-xs">
                                                            {step.estimated_cost}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.details}</p>
                                                {step.distance && (
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                                                        Distance: {step.distance}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Accommodations Section */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-orange-100 dark:bg-orange-950/40 p-2.5">
                                    <Hotel className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recommended Stays</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Curated accommodations matching your vibe</p>
                                </div>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                {trip.hotels.map((hotel, index) => (
                                    <div
                                        key={index}
                                        className="group overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                                    >
                                        <div className="relative h-44 w-full overflow-hidden">
                                            {hotel.image_url ? (
                                                <img
                                                    src={hotel.image_url}
                                                    alt={hotel.name}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://placehold.co/600x400?text=Premium+Stay";
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
                                                    No Preview Image
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 rounded-full bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 text-xs font-bold text-orange-600 backdrop-blur-sm shadow-sm flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-orange-500 text-orange-500" />
                                                {hotel.rating}
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                                                    {hotel.name}
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                    <span className="line-clamp-1">{hotel.address}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">ESTIMATED PRICE</span>
                                                    <span className="text-lg font-extrabold text-orange-600 dark:text-orange-400">{hotel.price}</span>
                                                </div>
                                                <Button size="sm" variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                                                    onClick={() => window.open(`https://www.google.com/search?q=book ${encodeURIComponent(hotel.name + " " + trip.trip_details.destination)}`, '_blank')}
                                                >
                                                    Book Now
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Itinerary Timeline Section */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-orange-100 dark:bg-orange-950/40 p-2.5">
                                        <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Day-by-Day Journey</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Step-by-step custom travel routes</p>
                                    </div>
                                </div>

                                {/* Modern Scrollable Tab Bar */}
                                <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                    <button
                                        onClick={() => setActiveDay("all")}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${
                                            activeDay === "all"
                                                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        Full Journey
                                    </button>
                                    {trip.itinerary.map((day) => (
                                        <button
                                            key={day.day}
                                            onClick={() => setActiveDay(day.day)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-300 ${
                                                activeDay === day.day
                                                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }`}
                                        >
                                            Day {day.day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Journey Timeline */}
                            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-8 space-y-12 pb-6">
                                <AnimatePresence mode="popLayout">
                                    {displayedDays.map((day, dayIndex) => (
                                        <motion.div
                                            key={day.day}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -15 }}
                                            transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
                                            className="relative"
                                        >
                                            {/* Glowing day node on line */}
                                            <div className="absolute -left-[43px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white font-bold text-xs shadow-md border-4 border-slate-50 dark:border-slate-950">
                                                {day.day}
                                            </div>

                                            <div className="mb-6 space-y-1">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Day {day.day}</h3>
                                                <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold tracking-wide">{day.theme}</p>
                                            </div>

                                            <div className="space-y-6">
                                                {day.activities.map((activity, actIndex) => (
                                                    <div
                                                        key={actIndex}
                                                        className="group flex flex-col sm:flex-row gap-5 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all"
                                                    >
                                                        {/* Activity Image */}
                                                        <div className="relative h-40 w-full sm:w-40 shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950">
                                                            {activity.image_url ? (
                                                                <img
                                                                    src={activity.image_url}
                                                                    alt={activity.place_name}
                                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = "https://placehold.co/600x400?text=Spot";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                                                                    No Image
                                                                </div>
                                                            )}
                                                            <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                                                {activity.time}
                                                            </div>
                                                        </div>

                                                        {/* Activity Details */}
                                                        <div className="flex flex-1 flex-col justify-between">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                                                                        {activity.place_name}
                                                                    </h4>
                                                                    <Badge variant="outline" className="border-orange-100 dark:border-orange-950/40 text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/10 text-xs font-semibold">
                                                                        {activity.ticket_price}
                                                                    </Badge>
                                                                </div>

                                                                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                                                                    {activity.details}
                                                                </p>
                                                            </div>

                                                            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/80 flex flex-wrap gap-2 justify-between items-center">
                                                                {activity.logistics ? (
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                                        <span className="font-bold text-slate-700 dark:text-slate-300 mr-1">Directions:</span>
                                                                        {activity.logistics}
                                                                    </div>
                                                                ) : (
                                                                    <div />
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-xs font-semibold h-8 rounded-full ml-auto"
                                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place_name + " " + trip.trip_details.destination)}`, '_blank')}
                                                                >
                                                                    View Map <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.section>
                    </div>

                    {/* Right Column: Widgets / Sidebar */}
                    <div className="space-y-8">
                        {/* Weather Widget */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <WeatherWidget destination={trip.trip_details.destination} />
                        </motion.div>

                        {/* Budget Estimator */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <BudgetEstimator
                                budgetTier={trip.trip_details.budget}
                                duration={durationDays}
                                travelers="couple"
                            />
                        </motion.div>

                        {/* Sticky Interactive Map */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="sticky top-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-sm overflow-hidden"
                        >
                            <MapView
                                destination={trip.trip_details.destination}
                                hotels={trip.hotels}
                                itinerary={trip.itinerary}
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
