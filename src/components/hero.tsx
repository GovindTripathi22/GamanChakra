"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Globe, MapPin, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Hero() {
    const router = useRouter();
    const [destination, setDestination] = useState("");

    const handleStart = () => {
        if (destination.trim()) {
            router.push(`/create-trip?destination=${encodeURIComponent(destination)}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleStart();
        }
    };

    return (
        <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden bg-slate-900 pt-20 pb-10">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/40 z-10" /> {/* Overlay for text readability */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                    poster="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
                >
                    <source src="https://videos.pexels.com/video-files/3209044/3209044-uhd_2560_1440_25fps.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center px-4 text-center w-full max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="mb-6 font-serif text-5xl font-bold text-white md:text-7xl drop-shadow-lg leading-tight">
                        <span className="text-orange-500">Discover</span> Your Next <br />
                        <span className="relative inline-block">
                            Adventure
                            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="#f97316" strokeWidth="4" fill="none" />
                            </svg>
                        </span>{" "}
                        with AI
                    </h1>
                    <p className="mb-10 text-xl text-white/90 md:text-2xl drop-shadow-md font-light">
                        Personalized itineraries at your fingertips. <br className="hidden md:block" />
                        Tell us what you love, and we'll plan the rest.
                    </p>
                </motion.div>

                {/* Search Input Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="relative mb-12 w-full max-w-3xl"
                >
                    <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-md transition-all focus-within:bg-white/20 focus-within:border-orange-500/50">
                        <Input
                            type="text"
                            placeholder="Trip to Udaipur, Rajasthan..."
                            className="h-16 border-none bg-transparent px-6 text-lg text-white placeholder:text-white/60 focus-visible:ring-0 md:text-xl"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button
                            size="icon"
                            onClick={handleStart}
                            className="absolute right-4 h-10 w-10 rounded-lg bg-orange-500 text-white hover:bg-orange-600 shadow-lg"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </motion.div>

                {/* Action Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-wrap justify-center gap-4"
                >
                    <ActionPill
                        icon={<Globe className="h-4 w-4 text-blue-500" />}
                        text="Create New Trip"
                        onClick={() => router.push('/create-trip')}
                    />
                    <ActionPill
                        icon={<Sparkles className="h-4 w-4 text-green-500" />}
                        text="Inspire me where to go"
                        onClick={() => router.push('/inspire')}
                    />
                    <ActionPill
                        icon={<MapPin className="h-4 w-4 text-orange-500" />}
                        text="Discover Hidden gems"
                        onClick={() => router.push('/hidden-gems')}
                    />
                    <ActionPill
                        icon={<Compass className="h-4 w-4 text-yellow-500" />}
                        text="Adventure Destination"
                        onClick={() => router.push('/adventure')}
                    />
                </motion.div>
            </div>
        </div>
    );
}

function ActionPill({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-md shadow-lg transition-all hover:bg-white hover:text-slate-900 hover:scale-105"
        >
            {icon}
            <span>{text}</span>
        </button>
    )
}
