"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plane, MapPin, Sparkles } from "lucide-react";
import { generateTrip, type TripData } from "@/actions/generate-trip";

const loadingMessages = [
    "🌍 Exploring destinations...",
    "🏨 Finding perfect hotels...",
    "🗺️ Planning your route...",
    "✨ Adding special touches...",
    "🎒 Packing your itinerary..."
];

export default function GeneratePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentMessage, setCurrentMessage] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Rotate loading messages
        const interval = setInterval(() => {
            setCurrentMessage((prev) => (prev + 1) % loadingMessages.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const generateItinerary = async () => {
            try {
                // Get trip data from URL params
                const tripData: TripData = {
                    origin: searchParams.get("origin") || "",
                    destination: searchParams.get("destination") || "",
                    days: searchParams.get("days") || "",
                    budget: searchParams.get("budget") || "",
                    travelers: searchParams.get("travelers") || "",
                    vibe: searchParams.get("vibe") || "",
                };

                // Validate required fields
                if (!tripData.destination || !tripData.days) {
                    throw new Error("Missing required trip information");
                }

                // Call AI generation
                const result = await generateTrip(tripData);

                // Increment usage counter locally for immediate feedback
                const currentTrips = parseInt(localStorage.getItem("tripsToday") || "0");
                localStorage.setItem("tripsToday", (currentTrips + 1).toString());
                window.dispatchEvent(new Event("tripGenerated"));

                // Store in localStorage for now (later we'll use a database)
                const tripId = Date.now().toString();
                localStorage.setItem(`trip_${tripId}`, JSON.stringify(result));

                // Navigate to itinerary page
                router.push(`/trip/${tripId}`);
            } catch (err) {
                console.error("Generation error:", err);
                setError(err instanceof Error ? err.message : "Failed to generate trip");
            }
        };

        generateItinerary();
    }, [searchParams, router]);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="mb-6 text-6xl">😔</div>
                    <h1 className="mb-4 text-3xl font-bold text-slate-900">Oops! Something went wrong</h1>
                    <p className="mb-6 text-slate-500">{error}</p>
                    <button
                        onClick={() => router.push("/create-trip")}
                        className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4">
            <div className="text-center">
                {/* Animated Plane */}
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="mb-8 flex justify-center"
                >
                    <Plane className="h-16 w-16 text-orange-500" />
                </motion.div>

                {/* Title */}
                <div className="mb-8 flex items-center justify-center gap-3">
                    <Sparkles className="h-8 w-8 text-orange-500" />
                    <h1 className="font-serif text-4xl font-bold text-slate-900">
                        Creating Your Perfect Journey
                    </h1>
                </div>

                {/* Loading Spinner */}
                <div className="mb-6 flex justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                </div>

                {/* Rotating Messages */}
                <motion.p
                    key={currentMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xl text-slate-500"
                >
                    {loadingMessages[currentMessage]}
                </motion.p>

                {/* Progress Dots */}
                <div className="mt-8 flex justify-center gap-2">
                    {loadingMessages.map((_, index) => (
                        <motion.div
                            key={index}
                            animate={{
                                scale: index === currentMessage ? 1.5 : 1,
                                opacity: index === currentMessage ? 1 : 0.3,
                            }}
                            className="h-2 w-2 rounded-full bg-orange-500"
                        />
                    ))}
                </div>

                {/* Fun Fact */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
                >
                    <MapPin className="mx-auto mb-3 h-6 w-6 text-orange-500" />
                    <p className="text-sm text-slate-500">
                        Did you know? AI is analyzing thousands of travel experiences to create your personalized itinerary! 🌟
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
