"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Globe, MapPin, Compass, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Hero() {
    const router = useRouter();
    const [destination, setDestination] = useState("");
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const handleStart = () => {
        if (destination.trim()) {
            setIsNavigating(true);
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
            {/* Background - Video or Fallback Gradient */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900/30 z-10" />

                {/* Animated gradient fallback (shows while video loads or on error) */}
                <AnimatePresence>
                    {(!videoLoaded || videoError) && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0"
                        >
                            {/* Animated gradient orbs */}
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-3xl" />

                            {/* Static fallback image */}
                            <img
                                src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
                                alt="Travel background"
                                className="h-full w-full object-cover opacity-40"
                                onLoad={() => { }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Video background */}
                {!videoError && (
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={`h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-60' : 'opacity-0'}`}
                        poster="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
                        onLoadedData={() => setVideoLoaded(true)}
                        onError={() => setVideoError(true)}
                    >
                        <source src="https://cdn.pixabay.com/video/2024/02/09/199958-911693663_large.mp4" type="video/mp4" />
                    </video>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center px-4 text-center w-full max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 backdrop-blur-sm"
                    >
                        <Sparkles className="h-4 w-4 text-orange-400" />
                        <span className="text-sm font-medium text-orange-300">AI-Powered Trip Planning</span>
                    </motion.div>

                    <h1 className="mb-6 font-serif text-5xl font-bold text-white md:text-7xl drop-shadow-lg leading-tight">
                        <span className="text-orange-500">Discover</span> Your Next <br />
                        <span className="relative inline-block">
                            Adventure
                            <motion.svg
                                className="absolute -bottom-2 left-0 w-full"
                                viewBox="0 0 100 10"
                                preserveAspectRatio="none"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ delay: 0.8, duration: 1 }}
                            >
                                <motion.path
                                    d="M0 5 Q 50 10 100 5"
                                    stroke="#f97316"
                                    strokeWidth="4"
                                    fill="none"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.8, duration: 1 }}
                                />
                            </motion.svg>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="relative mb-12 w-full max-w-3xl"
                >
                    <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-md transition-all focus-within:bg-white/20 focus-within:border-orange-500/50 hover:bg-white/15">
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
                            disabled={isNavigating}
                            className="absolute right-4 h-12 w-12 rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-orange-500/40 transition-all hover:scale-105 active:scale-95"
                        >
                            {isNavigating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </motion.div>

                {/* Action Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="flex flex-wrap justify-center gap-4"
                >
                    <ActionPill
                        icon={<Globe className="h-4 w-4 text-blue-400" />}
                        text="Create New Trip"
                        onClick={() => router.push('/create-trip')}
                    />
                    <ActionPill
                        icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                        text="Inspire me where to go"
                        onClick={() => router.push('/inspire')}
                    />
                    <ActionPill
                        icon={<MapPin className="h-4 w-4 text-orange-400" />}
                        text="Discover Hidden gems"
                        onClick={() => router.push('/hidden-gems')}
                    />
                    <ActionPill
                        icon={<Compass className="h-4 w-4 text-amber-400" />}
                        text="Adventure Destination"
                        onClick={() => router.push('/adventure')}
                    />
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2"
                >
                    <motion.div className="w-1 h-2 rounded-full bg-white/60" />
                </motion.div>
            </motion.div>
        </div>
    );
}

function ActionPill({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-md shadow-lg transition-all hover:bg-white hover:text-slate-900 cursor-pointer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            {icon}
            <span>{text}</span>
        </motion.button>
    )
}
