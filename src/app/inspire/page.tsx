"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function InspirePage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="relative h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30 z-10" />
                <img
                    src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
                    alt="Inspiration"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl"
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-md border border-white/30 text-white">
                            <Sparkles className="h-4 w-4" />
                            <span className="text-sm font-medium">AI-Powered Inspiration</span>
                        </div>
                        <h1 className="mb-6 font-serif text-5xl font-bold text-white md:text-7xl">
                            Let the World Surprise You
                        </h1>
                        <p className="mb-8 text-xl text-white/90 md:text-2xl">
                            Not sure where to go? Let our AI analyze your vibe and suggest the perfect unknown destination.
                        </p>
                        <Link href="/create-trip?destination=Surprise Me&vibe=Relaxed">
                            <Button className="h-14 rounded-full bg-white px-8 text-lg font-bold text-slate-900 hover:bg-slate-100 transition-all hover:scale-105">
                                Inspire Me Now <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto py-20 px-4">
                <div className="grid gap-12 md:grid-cols-3">
                    {[
                        {
                            title: "Curated for You",
                            desc: "Our AI learns your preferences to suggest spots you'll actually love.",
                            icon: "🎯"
                        },
                        {
                            title: "Beyond the Guidebooks",
                            desc: "Discover places that aren't on every top 10 list.",
                            icon: "✨"
                        },
                        {
                            title: "Complete Itineraries",
                            desc: "Get a full day-by-day plan instantly, not just a destination name.",
                            icon: "📅"
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center hover:shadow-lg transition-shadow"
                        >
                            <div className="mb-6 text-5xl">{item.icon}</div>
                            <h3 className="mb-4 text-xl font-bold text-slate-900">{item.title}</h3>
                            <p className="text-slate-600">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
