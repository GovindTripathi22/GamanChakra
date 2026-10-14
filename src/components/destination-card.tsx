"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Info } from "lucide-react";

interface DestinationCardProps {
    name: string;
    image: string;
    description: string;
    price: string;
    typicalDays?: string;
    slug: string;
    liveRisk?: number;
}

export function DestinationCard({ 
    name, 
    image, 
    description, 
    price, 
    typicalDays = "Typical 4 days for 2", 
    slug,
    liveRisk,
}: DestinationCardProps) {
    const riskColor = liveRisk == null ? "" : liveRisk >= 55 ? "#ef4444" : liveRisk >= 35 ? "#f59e0b" : liveRisk >= 15 ? "#eab308" : "#10b981";
    return (
        <Link href={`/destination/${slug}`}>
            <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative h-[470px] w-full overflow-hidden rounded-3xl cursor-pointer shadow-xl ring-1 ring-white/10 hover:ring-orange-500/40 hover:shadow-[0_30px_80px_-30px_rgba(255,106,26,.55)] transition-shadow"
            >
                <Image
                    src={image}
                    alt={name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Live risk badge (real-time news engine) */}
                {liveRisk != null && (
                    <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: riskColor }} />
                        Live risk {liveRisk}/100
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-95" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-6 text-white transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="mb-3 flex items-center justify-between opacity-0 transform translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                        <div className="rounded-full bg-orange-500/20 px-3 py-1 backdrop-blur-md border border-orange-500/30">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-orange-400" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                                    Verified Destination
                                </span>
                            </div>
                        </div>

                        <div className="rounded-full bg-slate-900/60 px-2.5 py-0.5 border border-white/10 text-[10px] text-slate-300 flex items-center gap-1">
                            <Info className="h-3 w-3 text-orange-400" />
                            <span>Transparent Cost Breakdown</span>
                        </div>
                    </div>

                    <h3 className="mb-2 text-3xl font-bold font-serif text-white drop-shadow-lg">{name}</h3>

                    <p className="mb-5 text-sm text-gray-300 line-clamp-2 leading-relaxed opacity-90">
                        {description}
                    </p>

                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-gray-300 font-medium tracking-wide">
                                {typicalDays}:
                            </span>
                            <span className="text-lg font-extrabold text-orange-400 tracking-tight font-sans">
                                {price}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                Incl. Stays, Transit, Food + 10% Buffer
                            </span>
                        </div>

                        <button className="rounded-full bg-white/10 px-5 py-2 text-xs font-semibold backdrop-blur-md border border-white/20 transition-all hover:bg-orange-500 hover:border-orange-500 hover:text-white group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                            View Plan & Costs
                        </button>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
