"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data store (in a real app, this would be a database or API)
const destinationsData: Record<string, any> = {
    goa: {
        name: "Goa",
        image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop",
        description: "Goa is a state in western India with coastlines stretching along the Arabian Sea. Its long history as a Portuguese colony prior to 1961 is evident in its preserved 17th-century churches and the area's tropical spice plantations.",
        highlights: ["Baga Beach", "Dudhsagar Falls", "Fort Aguada", "Basilica of Bom Jesus"],
        itinerary: [
            { day: 1, title: "Beach Hopping & Sunsets", desc: "Start with Calangute and Baga beaches. End the day watching the sunset at Anjuna." },
            { day: 2, title: "Heritage & Culture", desc: "Visit Old Goa churches and the Latin Quarter of Fontainhas." },
            { day: 3, title: "Nature & Spices", desc: "Trip to Dudhsagar Waterfalls and a spice plantation tour." },
        ],
    },
    jaipur: {
        name: "Jaipur",
        image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=1000&auto=format&fit=crop",
        description: "Jaipur is the capital of India’s Rajasthan state. It evokes the royal family that once ruled the region and that, in 1727, founded what is now called the Old City, or “Pink City” for its trademark building color.",
        highlights: ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar"],
        itinerary: [
            { day: 1, title: "Royal Heritage", desc: "Explore the City Palace and Hawa Mahal." },
            { day: 2, title: "Forts & Views", desc: "Visit Amber Fort and Nahargarh Fort for sunset views." },
            { day: 3, title: "Markets & Culture", desc: "Shop in Johari Bazaar and visit Albert Hall Museum." },
        ],
    },
    paris: {
        name: "Paris",
        image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop",
        description: "Paris, France's capital, is a major European city and a global center for art, fashion, gastronomy and culture. Its 19th-century cityscape is crisscrossed by wide boulevards and the River Seine.",
        highlights: ["Eiffel Tower", "Louvre Museum", "Notre-Dame", "Montmartre"],
        itinerary: [
            { day: 1, title: "Iconic Landmarks", desc: "Visit the Eiffel Tower and cruise the Seine." },
            { day: 2, title: "Art & History", desc: "Explore the Louvre and walk through the Tuileries Garden." },
            { day: 3, title: "Bohemian Vibes", desc: "Wander through Montmartre and visit Sacré-Cœur." },
        ],
    },
    // Fallback for other slugs
    default: {
        name: "Destination",
        image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop",
        description: "Explore this amazing destination with Gamanchakra. Let AI plan your perfect trip.",
        highlights: ["Top Attraction 1", "Local Cuisine", "Historic Sites", "Scenic Views"],
        itinerary: [
            { day: 1, title: "Arrival & Exploration", desc: "Check in and explore the local area." },
            { day: 2, title: "Sightseeing", desc: "Visit the main attractions and landmarks." },
            { day: 3, title: "Leisure & Departure", desc: "Enjoy some free time before heading back." },
        ],
    }
};

export default function DestinationPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const data = destinationsData[slug] || destinationsData.default;

    // Use the slug name if default fallback is used but we want to show the slug name
    const displayName = data === destinationsData.default && slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : data.name;

    return (
        <main className="min-h-screen bg-white dark:bg-slate-950 pb-20 transition-colors duration-300">
            {/* Hero Section */}
            <div className="relative h-[65vh] w-full overflow-hidden">
                <Image
                    src={data.image}
                    alt={displayName}
                    fill
                    className="object-cover scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-white dark:to-slate-950" />
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">
                    <div className="container mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1.5 backdrop-blur-md border border-orange-500/30">
                                <MapPin className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-semibold uppercase tracking-wider text-orange-200">
                                    Top Rated Destination
                                </span>
                            </div>
                            <h1 className="mb-4 font-serif text-6xl font-bold text-white md:text-8xl drop-shadow-2xl">
                                {displayName}
                            </h1>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto mt-12 grid gap-12 px-4 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    <motion.section
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-16"
                    >
                        <h2 className="mb-6 font-serif text-4xl font-bold text-slate-900 dark:text-white">About {displayName}</h2>
                        <div className="relative">
                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-orange-500 rounded-full" />
                            <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-300 pl-4">
                                {data.description}
                            </p>
                        </div>
                    </motion.section>

                    <section className="mb-12">
                        <h2 className="mb-8 font-serif text-4xl font-bold text-slate-900 dark:text-white">3-Day Sample <span className="text-orange-500">Experience</span></h2>
                        <div className="space-y-8">
                            {data.itinerary.map((item: any, index: number) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative flex gap-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-8 backdrop-blur-sm transition-all hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1"
                                >
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white font-bold text-xl shadow-lg shadow-orange-500/30">
                                        {item.day}
                                    </div>
                                    <div>
                                        <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">{item.title}</h3>
                                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Highlights Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8 shadow-sm backdrop-blur-sm"
                    >
                        <h3 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-orange-500" />
                            Key Highlights
                        </h3>
                        <ul className="space-y-4">
                            {data.highlights.map((highlight: string, index: number) => (
                                <li key={index} className="flex items-start gap-4 text-lg text-slate-600 dark:text-slate-400">
                                    <div className="mt-1.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                                    <span>{highlight}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Call to Action Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="sticky top-24 overflow-hidden rounded-3xl bg-slate-900 dark:bg-orange-500 p-8 text-white shadow-2xl transition-all duration-500 hover:scale-[1.02]"
                    >
                        {/* Abstract background pattern for CTA */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                        <div className="relative z-10">
                            <h3 className="mb-4 text-3xl font-bold leading-tight">Plan your trip to {displayName}</h3>
                            <p className="mb-8 text-slate-300 dark:text-orange-50 text-lg opacity-90">
                                Get a complete personalized itinerary crafted by AI in seconds.
                            </p>
                            <Link href={`/create-trip?destination=${encodeURIComponent(displayName)}`}>
                                <Button className="w-full bg-orange-500 dark:bg-slate-950 hover:bg-orange-600 dark:hover:bg-slate-900 text-white text-xl py-8 rounded-2xl shadow-xl transition-all hover:shadow-orange-500/25">
                                    Plan Now <ArrowRight className="ml-2 h-6 w-6" />
                                </Button>
                            </Link>
                            <div className="mt-6 flex items-center justify-center gap-4 text-sm font-medium text-slate-400 dark:text-orange-100">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-green-400 dark:text-white" /> AI Results
                                </span>
                                <span className="h-1 w-1 rounded-full bg-slate-700 dark:bg-white/30" />
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-orange-400 dark:text-white" /> 5 Seconds
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
