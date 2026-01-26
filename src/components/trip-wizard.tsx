"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Calendar, Users, Plane, Wallet, Banknote, Crown, User, Heart, Home, Ship, Palmtree, Mountain, UtensilsCrossed, Sparkles as SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Globe } from "@/components/globe";
import { getCoordinates } from "@/lib/geocoding";
import { PlaceAutocomplete } from "@/components/place-autocomplete";

interface TripFormData {
    origin: string;
    destination: string;
    days: string;
    budget: string;
    travelers: string;
    vibe: string;
    startDate?: string;
    travelMode?: string;
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
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<TripFormData>({
        origin: "",
        destination: "",
        days: "",
        budget: "",
        travelers: "",
        vibe: "",
    });

    const [addedDestinations, setAddedDestinations] = useState<string[]>([]);
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
        });
        router.push(`/generate?${params.toString()}`);
    };

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
                            onClick={() => setFormData({
                                origin: "",
                                destination: "",
                                days: "",
                                budget: "",
                                travelers: "",
                                vibe: "",
                            })}
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

                    {/* Step 1: Origin Input (Always visible initially) */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        {formData.origin.length > 2 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-6 overflow-hidden"
                            >
                                {/* Step 2: Destination Input */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        To where? (Destinations)
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
                                    <p className="mt-2 text-xs text-slate-500">
                                        Tip: Add multiple cities to create a full route!
                                    </p>
                                </div>

                                {/* Step 3: Duration */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        How many days?
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="Ex. 3"
                                        value={formData.days}
                                        onChange={(e) => handleInputChange("days", e.target.value)}
                                        className="h-14 rounded-xl border-slate-200 text-lg shadow-sm focus-visible:ring-orange-500"
                                    />
                                </div>

                                {/* Step 4: Budget */}
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-slate-700">
                                        What is your budget? <span className="text-slate-400 font-normal">(Per Person)</span>
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
                                            <span className="text-gray-500 sm:text-sm">₹</span>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Or enter custom budget per person (e.g. 20000)"
                                            value={formData.budget.match(/^\d+$/) ? formData.budget : ""}
                                            onChange={(e) => handleInputChange("budget", e.target.value)}
                                            className={cn(
                                                "h-14 pl-8 rounded-xl border-slate-200 text-lg shadow-sm focus-visible:ring-orange-500",
                                                formData.budget.match(/^\d+$/) ? "border-orange-500 ring-1 ring-orange-500" : ""
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Step 5: Travelers (Optional) */}
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-slate-700">
                                        Who are you traveling with? <span className="text-slate-400 font-normal">(Optional)</span>
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
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            When are you planning to go?
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                            <Input
                                                type="date"
                                                min={new Date().toISOString().split('T')[0]}
                                                value={formData.startDate ?? ""}
                                                onChange={(e) => handleInputChange("startDate", e.target.value)}
                                                className="h-14 pl-12 rounded-xl border-slate-200 text-lg shadow-sm focus-visible:ring-orange-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
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
                                                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md"
                                                            : "border-slate-200 bg-white text-slate-600"
                                                    )}
                                                >
                                                    {mode}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Step 7: Vibe */}
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-slate-700">
                                        Select your travel vibe
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
