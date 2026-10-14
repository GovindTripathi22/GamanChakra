"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Globe, MapPin, Compass, Sparkles, Loader2, Mic, Radar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Hero() {
    const router = useRouter();
    const [destination, setDestination] = useState("");
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [risk, setRisk] = useState<{ place: string; score: number; band: string } | null>(null);
    const [alerts, setAlerts] = useState<{ id: string; title: string; placeName: string | null; severity: string }[]>([]);

    // Live risk preview for whatever the traveller types (debounced, keyless)
    useEffect(() => {
        const q = destination.trim().slice(0, 80);
        if (q.length < 3) { setRisk(null); return; }
        const ctl = new AbortController();
        const t = setTimeout(async () => {
            try {
                const place = q.replace(/^(a\s+)?trip\s+to\s+/i, "").split(",")[0].trim();
                if (!place) return;
                const r = await fetch(`/api/risk?place=${encodeURIComponent(place)}`, { signal: ctl.signal });
                if (!r.ok) { setRisk(null); return; }
                const j = await r.json();
                if (j?.place?.name && Number.isFinite(j.score)) setRisk({ place: j.place.name, score: j.score, band: String(j.band ?? "") });
                else setRisk(null);
            } catch { if (!ctl.signal.aborted) setRisk(null); }
        }, 450);
        return () => { clearTimeout(t); ctl.abort(); };
    }, [destination]);

    useEffect(() => {
        let alive = true;
        fetch("/api/news?hours=48&minSeverity=high&limit=3")
            .then((r) => (r.ok ? r.json() : { events: [] }))
            .then((j) => { if (alive) setAlerts(Array.isArray(j?.events) ? j.events : []); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

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
                <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(7,11,22,.55)_0%,rgba(7,11,22,.35)_45%,var(--gc-bg)_100%)]" />
                <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,106,26,.22),transparent_60%)]" />

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
                                src="/destinations/kerala.jpg"
                                alt="Travel background"
                                className="h-full w-full object-cover opacity-100"
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
                        className={`h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                        poster="/destinations/kerala.jpg"
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
                        <span className="text-sm font-medium text-orange-300">AI-Powered Trip Planning · Live world-risk guardian</span>
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
                        Tell us what you love, and we'll plan the rest — then guard it against tomorrow's news.
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
                            className="h-16 border-none bg-transparent pl-6 pr-36 text-lg text-white placeholder:text-white/60 focus-visible:ring-0 md:text-xl"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            type="button"
                            aria-label="Ask Chakra by voice"
                            onClick={() => window.dispatchEvent(new CustomEvent("gc:jarvis", { detail: destination.trim() ? `Plan a trip to ${destination.trim()}` : undefined }))}
                            className="absolute right-[4.5rem] h-12 w-12 grid place-items-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition"
                        >
                            <Mic className="h-5 w-5" />
                        </button>
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
                    <AnimatePresence>
                        {risk && (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-4 -bottom-9 flex items-center gap-2 text-sm text-white/90">
                                <Radar className="h-4 w-4 text-orange-400" />
                                <span>Live risk for <b>{risk.place}</b>:</span>
                                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: risk.score >= 55 ? "#ef4444" : risk.score >= 35 ? "#f59e0b" : "#10b981", color: "#0b1020" }}>{risk.score}/100 · {risk.band}</span>
                                <Link href={`/risk`} className="text-xs underline underline-offset-2 text-white/70 hover:text-white">why?</Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                    <ActionPill
                        icon={<Radar className="h-4 w-4 text-rose-400" />}
                        text="Is it safe right now?"
                        onClick={() => router.push('/risk')}
                    />
                </motion.div>

                {/* Live alerts strip */}
                {alerts.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-10 w-full max-w-4xl rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md px-4 py-3 text-left">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />Live world alerts the agent is watching</div>
                        <ul className="mt-2 grid md:grid-cols-3 gap-2">
                            {alerts.map((a) => (
                                <li key={a.id} className="text-[13px] text-white/90 leading-snug line-clamp-2"><span className={a.severity === "critical" ? "text-red-400" : "text-orange-300"}>●</span> {a.title.replace(/^drill:\s*/i, "")}{a.placeName ? <span className="text-white/50"> · {a.placeName}</span> : null}</li>
                            ))}
                        </ul>
                    </motion.div>
                )}
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
