"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
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
        <main className="min-h-screen bg-white pb-20">
            {/* Hero Section */}
            <div className="relative h-[60vh] w-full overflow-hidden">
                <Image
                    src={data.image}
                    alt={displayName}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">
                    <div className="container mx-auto">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 font-serif text-5xl font-bold text-white md:text-7xl"
                        >
                            {displayName}
                        </motion.h1>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-2 text-white/90"
                        >
                            <MapPin className="h-5 w-5 text-orange-500" />
                            <span className="text-lg">Top Rated Destination</span>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto mt-12 grid gap-12 px-4 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    <section className="mb-12">
                        <h2 className="mb-6 text-3xl font-bold text-slate-900">About {displayName}</h2>
                        <p className="text-lg leading-relaxed text-slate-600">
                            {data.description}
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="mb-6 text-3xl font-bold text-slate-900">3-Day Highlights</h2>
                        <div className="space-y-6">
                            {data.itinerary.map((item: any, index: number) => (
                                <div key={index} className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-6 transition-shadow hover:shadow-md">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
                                        Day {item.day}
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-xl font-semibold text-slate-900">{item.title}</h3>
                                        <p className="text-slate-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Highlights Card */}
                    <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="mb-4 text-xl font-bold text-slate-900">Key Highlights</h3>
                        <ul className="space-y-3">
                            {data.highlights.map((highlight: string, index: number) => (
                                <li key={index} className="flex items-start gap-3 text-slate-600">
                                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-500" />
                                    <span>{highlight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Call to Action Card */}
                    <div className="sticky top-24 rounded-2xl bg-slate-900 p-8 text-white shadow-xl">
                        <h3 className="mb-4 text-2xl font-bold">Plan your trip to {displayName}</h3>
                        <p className="mb-6 text-slate-300">
                            Get a personalized itinerary crafted by AI in seconds. Flights, hotels, and activities included.
                        </p>
                        <Link href={`/create-trip?destination=${encodeURIComponent(displayName)}`}>
                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
                                Plan My Trip Now <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <p className="mt-4 text-center text-xs text-slate-400">
                            100% Free • AI Powered • Instant Results
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
