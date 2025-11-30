"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";

export default function HiddenGemsPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="relative h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30 z-10" />
                <img
                    src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop"
                    alt="Hidden Gems"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl"
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1.5 backdrop-blur-md border border-orange-500/30 text-orange-100">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm font-medium">Off the Beaten Path</span>
                        </div>
                        <h1 className="mb-6 font-serif text-5xl font-bold text-white md:text-7xl">
                            Discover Hidden Gems
                        </h1>
                        <p className="mb-8 text-xl text-white/90 md:text-2xl">
                            Escape the crowds. Find the secret spots, local favorites, and untouched beauty.
                        </p>
                        <Link href="/create-trip?destination=Hidden Gem&vibe=Relaxed">
                            <Button className="h-14 rounded-full bg-orange-500 px-8 text-lg font-bold text-white hover:bg-orange-600 transition-all hover:scale-105 shadow-lg shadow-orange-500/30">
                                Find Secret Spots <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto py-20 px-4">
                {/* Gem of the Day */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-20 rounded-3xl bg-slate-900 text-white overflow-hidden shadow-2xl"
                >
                    <div className="grid md:grid-cols-2">
                        <div className="relative h-64 md:h-auto">
                            <img
                                src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2066&auto=format&fit=crop"
                                alt="Cinque Terre"
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute top-4 left-4 rounded-full bg-orange-500 px-4 py-1 text-sm font-bold text-white shadow-lg">
                                Gem of the Day
                            </div>
                        </div>
                        <div className="p-8 md:p-12 flex flex-col justify-center">
                            <div className="mb-4 flex items-center gap-2 text-orange-400">
                                <MapPin className="h-5 w-5" />
                                <span className="font-medium">Cinque Terre, Italy</span>
                            </div>
                            <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">
                                The Colorful Cliffside Villages
                            </h2>
                            <p className="mb-8 text-slate-300">
                                A string of five centuries-old seaside villages on the rugged Italian Riviera coastline. In each of the 5 towns, colorful houses and vineyards cling to steep terraces, harbors are filled with fishing boats and trattorias turn out seafood specialties along with the Liguria region's famous sauce, pesto.
                            </p>

                            <div className="mb-8 grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">Crowd Meter</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 rounded-full bg-slate-700 overflow-hidden">
                                            <div className="h-full w-[40%] bg-green-500 rounded-full" />
                                        </div>
                                        <span className="text-sm font-medium text-green-400">Moderate</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">Best Time</p>
                                    <p className="font-medium text-white">May or September</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/10 mb-8">
                                <p className="text-sm font-medium text-orange-300 mb-1">💡 Local Tip</p>
                                <p className="text-sm text-slate-200">
                                    "Skip the train and hike the Blue Trail between Monterosso and Vernazza for the best views. Start early (7 AM) to have the path to yourself."
                                </p>
                            </div>

                            <Link href="/create-trip?destination=Cinque Terre&vibe=Romantic">
                                <Button className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100">
                                    Plan a Trip Here <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {[
                        { name: "Secret Beaches", query: "Secret Beaches", vibe: "Relaxed" },
                        { name: "Local Cafes", query: "Hidden Local Cafes", vibe: "Chill" },
                        { name: "Ancient Ruins", query: "Lesser Known Ruins", vibe: "Historic" },
                        { name: "Quiet Trails", query: "Secluded Hiking Trails", vibe: "Nature" }
                    ].map((item, i) => (
                        <Link
                            key={i}
                            href={`/create-trip?destination=${encodeURIComponent(item.query)}&vibe=${item.vibe}`}
                            className="block"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="aspect-square flex items-center justify-center rounded-3xl bg-slate-50 border border-slate-100 p-6 text-xl font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all cursor-pointer hover:shadow-lg"
                            >
                                {item.name}
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
