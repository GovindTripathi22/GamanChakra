"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
    Download,
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
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                    <p className="text-lg font-medium text-slate-600">Loading your adventure...</p>
                </div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="mb-6 text-6xl">🗺️</div>
                    <h1 className="mb-4 text-3xl font-serif font-bold text-slate-900">Trip Not Found</h1>
                    <p className="mb-6 text-slate-600">
                        This trip doesn't exist or has been deleted.
                    </p>
                    <Button onClick={() => router.push("/")} className="bg-orange-500 text-white hover:bg-orange-600">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    // Extract numeric duration for budget estimator
    const durationDays = parseInt(trip.trip_details.duration.split(" ")[0]) || 5;

    const getTransportIcon = (mode: string) => {
        const m = mode.toLowerCase();
        if (m.includes("flight") || m.includes("plane")) return <Plane className="h-5 w-5" />;
        if (m.includes("train") || m.includes("rail")) return <Train className="h-5 w-5" />;
        if (m.includes("bus")) return <Bus className="h-5 w-5" />;
        return <Car className="h-5 w-5" />;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="relative h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-slate-900/40 z-10" />
                <img
                    src={`https://image.pollinations.ai/prompt/cinematic%20photo%20of%20${encodeURIComponent(trip.trip_details.destination)}%20landmark%20sunset%20aesthetic%204k?width=1600&height=900&nologo=true`}
                    alt={trip.trip_details.destination}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-12">
                    <div className="flex justify-between">
                        <Button
                            onClick={() => router.push("/")}
                            variant="outline"
                            className="border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <div className="flex gap-2">
                            <PdfExportButton trip={trip} />
                            <Button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert("Trip link copied to clipboard!");
                                }}
                                variant="outline"
                                className="border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                        </div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl"
                    >
                        <Badge className="mb-4 bg-orange-500 text-white hover:bg-orange-600">
                            {trip.trip_details.duration} Trip
                        </Badge>
                        <h1 className="font-serif text-5xl font-bold text-white md:text-7xl">
                            {trip.trip_details.destination}
                        </h1>
                        <div className="mt-6 flex flex-wrap gap-6 text-white/90">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5" />
                                <span className="text-lg font-medium capitalize">{trip.trip_details.budget} Budget</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <span className="text-lg font-medium capitalize">{trip.trip_details.vibe} Vibe</span>
                            </div>
                            {trip.trip_details.total_estimated_cost && (
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="h-5 w-5" />
                                    <span className="text-lg font-medium">Est. {trip.trip_details.total_estimated_cost}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-12 -mt-20 relative z-30">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content - Left Column */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* Transportation Plan Section */}
                        {trip.transportation_plan && trip.transportation_plan.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100"
                            >
                                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Navigation className="h-6 w-6 text-orange-500" />
                                    <h2 className="font-serif text-2xl font-bold text-slate-900">
                                        Getting There
                                    </h2>
                                </div>
                                <div className="space-y-4">
                                    {trip.transportation_plan.map((step, index) => (
                                        <div key={index} className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-6 transition-all hover:border-orange-200 hover:shadow-md">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-orange-600">
                                                {getTransportIcon(step.mode)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <h3 className="text-lg font-bold text-slate-900">{step.mode}</h3>
                                                    <div className="flex gap-2">
                                                        <Badge variant="secondary" className="bg-white text-slate-700 border border-slate-200">
                                                            {step.duration}
                                                        </Badge>
                                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                                                            {step.estimated_cost}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 leading-relaxed">{step.details}</p>
                                                {step.distance && (
                                                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 font-medium">
                                                        <MapPin className="h-4 w-4 text-orange-500" />
                                                        Distance: {step.distance}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Hotels Section */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Hotel className="h-6 w-6 text-orange-500" />
                                    <h2 className="font-serif text-3xl font-bold text-slate-900">
                                        Where to Stay
                                    </h2>
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                {trip.hotels.map((hotel, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 * index }}
                                        className="group overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300"
                                    >
                                        <div className="relative h-48 w-full overflow-hidden">
                                            {hotel.image_url ? (
                                                <img
                                                    src={hotel.image_url}
                                                    alt={hotel.name}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://placehold.co/600x400?text=No+Image+Available";
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    No Image
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4 rounded-full bg-white/90 px-2 py-1 text-sm font-bold text-orange-600 backdrop-blur-sm shadow-sm flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-orange-500" />
                                                {hotel.rating}
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="mb-2 text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                                                {hotel.name}
                                            </h3>
                                            <p className="mb-4 text-sm text-slate-500 line-clamp-2">{hotel.address}</p>
                                            <p className="mb-4 text-sm text-slate-600 line-clamp-3">
                                                {hotel.description}
                                            </p>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                <span className="text-lg font-bold text-slate-900">
                                                    {hotel.price}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    className="bg-slate-900 text-white hover:bg-orange-500 transition-colors"
                                                    onClick={() => window.open(`https://www.google.com/search?q=book ${encodeURIComponent(hotel.name + " " + trip.trip_details.destination)}`, '_blank')}
                                                >
                                                    Book Now
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Itinerary Section */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="mb-8 flex items-center gap-3">
                                <MapPin className="h-6 w-6 text-orange-500" />
                                <h2 className="font-serif text-3xl font-bold text-slate-900">
                                    Your Daily Itinerary
                                </h2>
                            </div>

                            <div className="relative border-l-2 border-slate-200 pl-8 space-y-12 ml-4">
                                {trip.itinerary.map((day, dayIndex) => (
                                    <motion.div
                                        key={day.day}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * dayIndex }}
                                        className="relative"
                                    >
                                        <div className="absolute -left-[41px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white font-bold shadow-md border-4 border-white">
                                            {day.day}
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="text-2xl font-bold text-slate-900">Day {day.day}</h3>
                                            <p className="text-lg text-orange-600 font-medium">{day.theme}</p>
                                        </div>

                                        <div className="space-y-8">
                                            {day.activities.map((activity, actIndex) => (
                                                <div
                                                    key={actIndex}
                                                    className="group flex flex-col md:flex-row gap-6 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
                                                >
                                                    <div className="relative h-48 w-full md:w-48 shrink-0 overflow-hidden rounded-xl">
                                                        {activity.image_url ? (
                                                            <img
                                                                src={activity.image_url}
                                                                alt={activity.place_name}
                                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "https://placehold.co/600x400?text=No+Image+Available";
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                                No Image
                                                            </div>
                                                        )}
                                                        <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                            {activity.time}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-1 flex-col">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                                                                {activity.place_name}
                                                            </h4>
                                                            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                                                                {activity.ticket_price}
                                                            </Badge>
                                                        </div>

                                                        <p className="mb-4 text-slate-600 text-sm leading-relaxed">
                                                            {activity.details}
                                                        </p>

                                                        {activity.logistics && (
                                                            <div className="mt-auto rounded-lg bg-slate-50 p-3 text-sm text-slate-600 border border-slate-100">
                                                                <span className="font-semibold text-slate-900 mr-1">Getting there:</span>
                                                                {activity.logistics}
                                                            </div>
                                                        )}

                                                        <div className="mt-4 flex justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place_name + " " + trip.trip_details.destination)}`, '_blank')}
                                                            >
                                                                View on Map <ArrowRight className="ml-1 h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.section>
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="space-y-8">
                        {/* Weather Widget */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <WeatherWidget destination={trip.trip_details.destination} />
                        </motion.div>

                        {/* Budget Estimator */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <BudgetEstimator
                                budgetTier={trip.trip_details.budget}
                                duration={durationDays}
                                travelers="couple"
                            />
                        </motion.div>

                        {/* Interactive Map */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                            className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm"
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
