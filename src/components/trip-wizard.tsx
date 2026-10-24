"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Calendar, Users, Plane, Wallet, Banknote, Crown, User, Heart, Home, Ship, Palmtree, Mountain, UtensilsCrossed, Sparkles as SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Globe } from "@/components/globe";
import { getCoordinates } from "@/lib/geocoding";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { parseTripPrompt } from "@/lib/planner/prompt-parser";

interface TripFormData {
    origin: string;
    destination: string;
    days: string;
    budget: string;
    travelers: string;
    vibe: string;
    startDate?: string;
    travelMode?: string;
    includeTravelDays?: "yes" | "no";
}

const budgetOptions = [
    {
        id: "cheap",
        title: "Cheap",
        desc: "Stay conscious of costs",
        icon: Banknote,
        color: "text-emerald-500",
    },
    {
        id: "moderate",
        title: "Moderate",
        desc: "Keep cost on the average side",
        icon: Wallet,
        color: "text-blue-500",
    },
    {
        id: "luxury",
        title: "Luxury",
        desc: "Don't worry about cost",
        icon: Crown,
        color: "text-amber-500",
    },
];

const travelerOptions = [
    {
        id: "just-me",
        title: "Just Me",
        desc: "A sole traveler in exploration",
        icon: User,
        color: "text-purple-500",
        people: "1",
    },
    {
        id: "couple",
        title: "A Couple",
        desc: "Two travelers in tandem",
        icon: Heart,
        color: "text-rose-500",
        people: "2 People",
    },
    {
        id: "family",
        title: "Family",
        desc: "A group of fun loving adventurers",
        icon: Home,
        color: "text-sky-500",
        people: "3 to 5 People",
    },
    {
        id: "friends",
        title: "Friends",
        desc: "A bunch of thrill-seekers",
        icon: Ship,
        color: "text-teal-500",
        people: "5 to 10 People",
    },
];

const vibeOptions = [
    {
        id: "relaxed",
        title: "Relaxed",
        icon: Palmtree,
        color: "text-emerald-500",
        desc: "Chill & Peace",
    },
    {
        id: "adventure",
        title: "Adventure",
        icon: Mountain,
        color: "text-orange-500",
        desc: "Thrills & Nature",
    },
    {
        id: "foodie",
        title: "Foodie",
        icon: UtensilsCrossed,
        color: "text-red-500",
        desc: "Eat Everything",
    },
    {
        id: "spiritual",
        title: "Spiritual",
        icon: SparklesIcon,
        color: "text-violet-500",
        desc: "Inner Peace",
    },
];

export function TripWizard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [isPrefilled, setIsPrefilled] = useState(false);
    const [formData, setFormData] = useState<TripFormData>({
        origin: "",
        destination: "",
        days: "",
        budget: "",
        travelers: "",
        vibe: "",
        includeTravelDays: "yes",
    });

    // Sync from URL search params (e.g. from homepage hero search or direct link)
    useEffect(() => {
        let destParam = searchParams.get("destination") || undefined;
        let originParam = searchParams.get("origin") || undefined;
        let daysParam = searchParams.get("days") || undefined;
        let vibeParam = searchParams.get("vibe") || undefined;
        let budgetParam = searchParams.get("budget") || undefined;
        let travelersParam = searchParams.get("travelers") || undefined;
        let startDateParam = searchParams.get("startDate") || undefined;
        let travelModeParam = searchParams.get("travelMode") || undefined;
        let includeTravelParam = searchParams.get("includeTravelDays") || undefined;

        // If destParam contains conversational tokens or multiple words, run prompt parser as fallback
        if (destParam && (/\b(from|to|for|under|budget|couple|family|friends|solo|days?|din|k|lakh)\b/i.test(destParam) || destParam.trim().includes(" "))) {
            const parsed = parseTripPrompt(destParam);
            if (parsed.destination) destParam = parsed.destination;
            if (!originParam && parsed.origin) originParam = parsed.origin;
            if (!daysParam && parsed.days) daysParam = parsed.days;
            if (!budgetParam && parsed.budget) budgetParam = parsed.budget;
            if (!travelersParam && parsed.travelers) travelersParam = parsed.travelers;
            if (!vibeParam && parsed.vibe) vibeParam = parsed.vibe;
            if (!startDateParam && parsed.startDate) startDateParam = parsed.startDate;
            if (!includeTravelParam && parsed.includeTravelDays) includeTravelParam = parsed.includeTravelDays;
        }

        // Normalize budget to wizard format ("Cheap", "Moderate", "Luxury", or numeric string)
        let normalizedBudget = budgetParam;
        if (budgetParam) {
            if (/^(cheap|budget|low|backpack)$/i.test(budgetParam)) {
                normalizedBudget = "Cheap";
            } else if (/^(moderate|standard|medium|mid)$/i.test(budgetParam)) {
                normalizedBudget = "Moderate";
            } else if (/^(luxury|premium|deluxe|5\s*star)$/i.test(budgetParam)) {
                normalizedBudget = "Luxury";
            }
        }

        // Normalize travelers to wizard format:
        // "1" (Just Me), "2 People" (Couple), "3 to 5 People" (Family), "5 to 10 People" (Friends)
        let normalizedTravelers = travelersParam;
        if (travelersParam) {
            if (/^(just-me|solo|1|1\s*person)$/i.test(travelersParam)) {
                normalizedTravelers = "1";
            } else if (/^(couple|2|2\s*people|two)$/i.test(travelersParam)) {
                normalizedTravelers = "2 People";
            } else if (/^(family|3|4|5|3\s*to\s*5.*)$/i.test(travelersParam)) {
                normalizedTravelers = "3 to 5 People";
            } else if (/^(friends|group|5\s*to\s*10.*|>5)$/i.test(travelersParam)) {
                normalizedTravelers = "5 to 10 People";
            }
        }

        // Normalize vibe ("Relaxed", "Adventure", "Foodie", "Spiritual"), defaulting to "Relaxed" if pre-filling trip
        let normalizedVibe = vibeParam;
        if (vibeParam) {
            if (/relax/i.test(vibeParam)) normalizedVibe = "Relaxed";
            else if (/adv/i.test(vibeParam)) normalizedVibe = "Adventure";
            else if (/food/i.test(vibeParam)) normalizedVibe = "Foodie";
            else if (/spirit/i.test(vibeParam)) normalizedVibe = "Spiritual";
        } else if (destParam && (daysParam || normalizedBudget)) {
            normalizedVibe = "Relaxed";
        }

        if (destParam || originParam || daysParam || normalizedVibe || normalizedBudget || normalizedTravelers || startDateParam || travelModeParam || includeTravelParam) {
            setIsPrefilled(true);
            setFormData((prev) => ({
                ...prev,
                destination: destParam ?? prev.destination,
                origin: originParam ?? prev.origin,
                days: daysParam ?? prev.days,
                vibe: normalizedVibe ?? prev.vibe,
                budget: normalizedBudget ?? prev.budget,
                travelers: normalizedTravelers ?? prev.travelers,
                startDate: startDateParam ?? prev.startDate,
                travelMode: travelModeParam ?? prev.travelMode,
                includeTravelDays:
                    includeTravelParam === "no"
                        ? "no"
                        : includeTravelParam === "yes"
                        ? "yes"
                        : prev.includeTravelDays,
            }));
        }
    }, [searchParams]);

    const [addedDestinations, setAddedDestinations] = useState<string[]>([]);
    // Computed in the browser (local timezone) so server and client HTML always match.
    const [minDate, setMinDate] = useState("");
    useEffect(() => {
        const d = new Date();
        setMinDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }, []);
    const [globeCenter, setGlobeCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

    // Debounce geocoding for Origin
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.origin.length > 2) {
                const coords = await getCoordinates(formData.origin);
                if (coords) setGlobeCenter(coords);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData.origin]);

    // Debounce geocoding for Destination
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.destination.length > 2) {
                const coords = await getCoordinates(formData.destination);
                if (coords) setGlobeCenter(coords);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData.destination]);

    const handleAddDestination = () => {
        if (formData.destination && formData.destination.length > 2) {
            setAddedDestinations([...addedDestinations, formData.destination]);
            setFormData(prev => ({ ...prev, destination: "" }));
        }
    };

    const handleRemoveDestination = (index: number) => {
        setAddedDestinations(addedDestinations.filter((_, i) => i !== index));
    };

    const handleInputChange = (name: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const isFormValid = () => {
        return (
            formData.origin &&
            (formData.destination || addedDestinations.length > 0) &&
            formData.days &&
            formData.budget &&
            // Travelers is now optional
            formData.vibe
        );
    };

    const onGenerateTrip = async () => {
        setLoading(true);
        // Combine all destinations
        const allDestinations = [...addedDestinations, formData.destination].filter(Boolean);
        const finalDestination = allDestinations.join(" | ");

        const params = new URLSearchParams({
            ...formData,
            destination: finalDestination,
            travelers: formData.travelers || "2 People", // Default if not selected
            startDate: formData.startDate || "",
            travelMode: formData.travelMode || "",
            includeTravelDays: formData.includeTravelDays || "yes",
        });
        router.push(`/generate?${params.toString()}`);
    };

    const parsedDays = parseInt(formData.days, 10) || 0;
    const hasTravelDays = formData.includeTravelDays !== "no";
    const totalTripDays = parsedDays > 0 ? (hasTravelDays ? parsedDays : parsedDays + 2) : 0;

    let dateRangeSummary = "";
    if (formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate) && totalTripDays > 0) {
        const [y, m, d] = formData.startDate.split("-").map(Number);
        const s = new Date(Date.UTC(y, m - 1, d));
        const e = new Date(Date.UTC(y, m - 1, d + totalTripDays - 1));
        const startStr = s.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
        const endStr = e.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
        dateRangeSummary = `${startStr} – ${endStr}`;
    }

    return (
        <div className="grid min-h-[calc(100vh-80px)] gap-8 lg:grid-cols-2 lg:p-8">
            {/* Left Panel - Wizard Form */}
            <div className="flex flex-col justify-center px-4 py-8 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="mb-2 text-4xl font-bold font-serif text-slate-900 dark:text-white">
                        Start Planning new <span className="text-orange-500">Trip</span> using AI
                    </h2>
                    <p className="mb-8 text-slate-500 dark:text-slate-400">
                        Discover personalized travel itineraries, find the best destinations, and plan your dream vacation effortlessly with the power of AI.
                    </p>

                    {/* Action Pills */}
                    <div className="mb-8 flex flex-wrap gap-3">
                        <button
                            onClick={() => {
                                setIsPrefilled(false);
                                setFormData({
                                    origin: "",
                                    destination: "",
                                    days: "",
                                    budget: "",
                                    travelers: "",
                                    vibe: "",
                                });
                            }}
                            className="rounded-full border border-orange-500 bg-orange-50 dark:bg-orange-500/20 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/30 transition-colors"
                        >
                            Create New Trip
                        </button>
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, destination: "Surprise Me", vibe: "Relaxed" }))}
                            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                        >
                            Inspire me where to go
                        </button>
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, destination: "Hidden Gem", vibe: "Relaxed" }))}
                            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                        >
                            Discover Hidden gems
                        </button>
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, destination: "Adventure Capital", vibe: "Adventure" }))}
                            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                        >
                            Adventure Destination
                        </button>
                    </div>

                    {/* Pre-fill Notification Banner */}
                    <AnimatePresence>
                        {isPrefilled && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3.5 text-xs text-orange-950 dark:text-orange-200 backdrop-blur-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <SparklesIcon className="h-4 w-4 text-orange-500 shrink-0" />
                                    <span>
                                        <b>Smart Prompt Detected:</b> We automatically filled in your trip parameters below. Feel free to adjust!
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPrefilled(false)}
                                    className="text-orange-600 hover:text-orange-800 dark:text-orange-300 dark:hover:text-white font-medium underline shrink-0 cursor-pointer"
                                >
                                    Dismiss
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step 1: Origin Input (Always visible initially) */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                            From where? (Origin)
                        </label>
                        <div className="relative">
                            <Plane className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 h-5 w-5 z-10" />
                            <PlaceAutocomplete
                                placeholder="City, Airport, or Country"
                                value={formData.origin}
                                onChange={(val) => handleInputChange("origin", val)}
                                className="h-14 pl-12 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg shadow-sm focus-visible:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* Expandable Steps */}
                    <AnimatePresence>
                        {(formData.origin.length > 2 || formData.destination.length > 1 || formData.days.length > 0 || isPrefilled) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-6 overflow-hidden"
                            >
                                {/* Step 2: Destination Input */}
                                <div className="mb-8 space-y-6">
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                        Where do you want to go?
                                    </label>
                                    {/* Added Destinations List */}
                                    {addedDestinations.length > 0 && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {addedDestinations.map((dest, index) => (
                                                <div key={index} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                                                    <MapPin className="h-3 w-3" />
                                                    {dest}
                                                    <button onClick={() => handleRemoveDestination(index)} className="ml-1 hover:text-red-500">
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative flex gap-2">
                                        <div className="relative flex-1">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 z-10" />
                                            <PlaceAutocomplete
                                                placeholder={addedDestinations.length > 0 ? "Add another destination..." : "Search for a destination (e.g., Paris)"}
                                                value={formData.destination}
                                                onChange={(val) => handleInputChange("destination", val)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddDestination();
                                                    }
                                                }}
                                                className="h-14 pl-12 rounded-xl border-slate-200 text-lg shadow-sm focus-visible:ring-orange-500"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleAddDestination}
                                            disabled={!formData.destination}
                                            className="h-14 w-14 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                                        Tip: Add multiple cities to create a full route!
                                    </p>
                                </div>

                                {/* Step 3: Duration & Travel Days Filter */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                            How many days?
                                        </label>
                                        <Input
                                            type="number"
                                            placeholder="Ex. 11"
                                            value={formData.days}
                                            onChange={(e) => handleInputChange("days", e.target.value)}
                                            className="h-14 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg shadow-sm focus-visible:ring-orange-500"
                                        />
                                    </div>

                                    {/* Travel Days Inclusion Option */}
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                Include travel days in trip duration?
                                            </span>
                                            <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                                                {formData.includeTravelDays !== "no" ? "Total duration includes travel" : "Pure destination stay (+travel)"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {formData.days
                                                ? formData.includeTravelDays !== "no"
                                                    ? `Trip of ${formData.days} days total: Day 1 departure & travel, Day ${formData.days} return journey, and ${Math.max(1, (parseInt(formData.days, 10) || 1) - 2)} full days exploring at destination.`
                                                    : `Trip of ${formData.days} full days at destination + arrival and departure travel days added (${(parseInt(formData.days, 10) || 1) + 2} days total).`
                                                : "Choose whether your total duration accounts for departure/return travel days or represents pure destination stay."}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange("includeTravelDays", "yes")}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                                    formData.includeTravelDays !== "no"
                                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-950 dark:text-orange-200 font-semibold shadow-sm"
                                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-3.5 w-3.5 rounded-full border shrink-0 flex items-center justify-center",
                                                    formData.includeTravelDays !== "no" ? "border-orange-500 bg-orange-500" : "border-slate-400"
                                                )}>
                                                    {formData.includeTravelDays !== "no" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-xs">Yes, including travel</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">Day 1 & Day N are travel</div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange("includeTravelDays", "no")}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                                    formData.includeTravelDays === "no"
                                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-950 dark:text-orange-200 font-semibold shadow-sm"
                                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-3.5 w-3.5 rounded-full border shrink-0 flex items-center justify-center",
                                                    formData.includeTravelDays === "no" ? "border-orange-500 bg-orange-500" : "border-slate-400"
                                                )}>
                                                    {formData.includeTravelDays === "no" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-xs">No, pure destination stay</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">Travel days added separately</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4: Budget */}
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                        What is your budget? <span className="text-slate-400 dark:text-slate-500 font-normal">(Per Person)</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        {budgetOptions.map((option) => {
                                            const IconComponent = option.icon;
                                            return (
                                                <div
                                                    key={option.id}
                                                    onClick={() => handleInputChange("budget", option.title)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-1",
                                                        formData.budget === option.title
                                                            ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 shadow-md"
                                                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                    )}
                                                >
                                                    <div className={cn("mb-2", option.color)}>
                                                        <IconComponent className="h-7 w-7" />
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{option.title}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Manual Budget Input */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <span className="text-gray-500 dark:text-slate-400 sm:text-sm">₹</span>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Or enter custom budget..."
                                            value={formData.budget === "Cheap" || formData.budget === "Moderate" || formData.budget === "Luxury" ? "" : formData.budget}
                                            onChange={(e) => handleInputChange("budget", e.target.value)}
                                            className="h-14 pl-8 rounded-xl border-slate-200 dark:border-slate-700 text-lg shadow-sm focus-visible:ring-orange-500 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Step 5: Travelers (Optional) */}
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                        Who are you traveling with?
                                    </label>
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
                                        {travelerOptions.map((option) => {
                                            const IconComponent = option.icon;
                                            return (
                                                <div
                                                    key={option.id}
                                                    onClick={() => handleInputChange("travelers", option.people)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-1",
                                                        formData.travelers === option.people
                                                            ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 shadow-md"
                                                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                    )}
                                                >
                                                    <div className={cn("mb-2", option.color)}>
                                                        <IconComponent className="h-7 w-7" />
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{option.title}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Manual Travelers Input */}
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                        <Input
                                            type="number"
                                            placeholder="Or enter specific number of people"
                                            value={formData.travelers.match(/^\d+ People$/) ? formData.travelers.split(" ")[0] : ""}
                                            onChange={(e) => handleInputChange("travelers", e.target.value ? `${e.target.value} People` : "")}
                                            className={cn(
                                                "h-14 pl-12 rounded-xl border-slate-200 text-lg shadow-sm focus-visible:ring-orange-500",
                                                formData.travelers.match(/^\d+ People$/) ? "border-orange-500 ring-1 ring-orange-500" : ""
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Step 6: Dates & Travel Mode */}
                                <div className="space-y-4">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                                When are you planning to go? (Start Date)
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 h-5 w-5 z-10" />
                                                <Input
                                                    type="date"
                                                    min={minDate || undefined}
                                                    value={formData.startDate ?? ""}
                                                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                                                    className="h-14 pl-12 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg shadow-sm focus-visible:ring-orange-500 dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                                Preferred Mode of Travel
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["Flight", "Train", "Bus", "Cab"].map((mode) => (
                                                    <div
                                                        key={mode}
                                                        onClick={() => handleInputChange("travelMode", mode)}
                                                        className={cn(
                                                            "cursor-pointer flex items-center justify-center rounded-xl border p-3 text-sm font-medium transition-all hover:shadow-md",
                                                            formData.travelMode === mode
                                                                ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 shadow-md font-semibold"
                                                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                                        )}
                                                    >
                                                        {mode}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Travel Days & Dates Schedule Preview */}
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                                Trip Dates & Travel Days Allocation:
                                            </span>
                                            {dateRangeSummary && (
                                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                                                    {dateRangeSummary} ({totalTripDays} Days total)
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {formData.days
                                                ? formData.includeTravelDays !== "no"
                                                    ? `Trip of ${formData.days} days total: Day 1 departure & transit, Day ${formData.days} return journey, with ${Math.max(1, (parseInt(formData.days, 10) || 1) - 2)} full days at destination.`
                                                    : `Trip of ${formData.days} full days at destination + 2 travel days added (${(parseInt(formData.days, 10) || 1) + 2} total days scheduled).`
                                                : "Choose whether your selected days include travel time or represent pure stay at destination."}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange("includeTravelDays", "yes")}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer",
                                                    formData.includeTravelDays !== "no"
                                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-950 dark:text-orange-200 font-semibold shadow-sm"
                                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-3.5 w-3.5 rounded-full border shrink-0 flex items-center justify-center",
                                                    formData.includeTravelDays !== "no" ? "border-orange-500 bg-orange-500" : "border-slate-400"
                                                )}>
                                                    {formData.includeTravelDays !== "no" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-xs">Yes, including travel</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">Day 1 & Day N are travel</div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInputChange("includeTravelDays", "no")}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer",
                                                    formData.includeTravelDays === "no"
                                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-950 dark:text-orange-200 font-semibold shadow-sm"
                                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-3.5 w-3.5 rounded-full border shrink-0 flex items-center justify-center",
                                                    formData.includeTravelDays === "no" ? "border-orange-500 bg-orange-500" : "border-slate-400"
                                                )}>
                                                    {formData.includeTravelDays === "no" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-xs">No, pure destination stay</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">Travel days added separately</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 7: Vibe */}
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                        What&apos;s the vibe?
                                    </label>
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                        {vibeOptions.map((option) => {
                                            const IconComponent = option.icon;
                                            return (
                                                <div
                                                    key={option.id}
                                                    onClick={() => handleInputChange("vibe", option.title)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-1",
                                                        formData.vibe === option.title
                                                            ? "border-orange-500 bg-orange-50 dark:bg-orange-500/20 shadow-md"
                                                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                    )}
                                                >
                                                    <div className={cn("mb-2", option.color)}>
                                                        <IconComponent className="h-7 w-7" />
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{option.title}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <Button
                                    onClick={onGenerateTrip}
                                    disabled={!isFormValid()}
                                    className="h-14 w-full rounded-xl bg-orange-500 text-lg font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    ) : (
                                        "Generate Trip"
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Right Panel - Globe */}
            <div className="hidden lg:block relative h-full w-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900">
                <Globe center={globeCenter} />
            </div>
        </div>
    );
}
