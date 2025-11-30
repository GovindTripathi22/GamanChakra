"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

export default function AdventurePage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="relative h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30 z-10" />
                <img
                    src="https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=1974&auto=format&fit=crop"
                    alt="Adventure"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl"
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-yellow-500/20 px-4 py-1.5 backdrop-blur-md border border-yellow-500/30 text-yellow-100">
                            <Compass className="h-4 w-4" />
                            <span className="text-sm font-medium">For the Thrill Seekers</span>
                        </div>
                        <h1 className="mb-6 font-serif text-5xl font-bold text-white md:text-7xl">
                            Adventure Awaits
                        </h1>
                        <p className="mb-8 text-xl text-white/90 md:text-2xl">
                            Hiking, diving, climbing, or exploring. Plan the ultimate adrenaline-filled journey.
                        </p>
                        <Link href="/create-trip?destination=Adventure Capital&vibe=Adventure">
                            <Button className="h-14 rounded-full bg-yellow-500 px-8 text-lg font-bold text-slate-900 hover:bg-yellow-400 transition-all hover:scale-105 shadow-lg shadow-yellow-500/30">
                                Start Your Adventure <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto py-20 px-4">
                <div className="grid gap-8 md:grid-cols-3">
                    {[
                        { title: "Hiking", img: "https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2070&auto=format&fit=crop" },
                        { title: "Surfing", img: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=2070&auto=format&fit=crop" },
                        { title: "Climbing", img: "https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=2006&auto=format&fit=crop" }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="group relative h-80 overflow-hidden rounded-3xl cursor-pointer"
                        >
                            <img src={item.img} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute bottom-6 left-6 text-white">
                                <h3 className="text-2xl font-bold">{item.title}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
