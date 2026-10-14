"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DestinationCard } from "./destination-card";

interface Destination {
    name: string;
    image: string;
    description: string;
    price: string;
    typicalDays?: string;
    slug: string;
}

interface DestinationSectionProps {
    title: string;
    subtitle: string;
    destinations: Destination[];
}

export function DestinationSection({ title, subtitle, destinations }: DestinationSectionProps) {
    // Live risk index per destination from the real-time news engine
    const [risk, setRisk] = useState<Record<string, number>>({});
    useEffect(() => {
        let alive = true;
        Promise.all(destinations.map(async (d) => {
            try { const r = await fetch(`/api/risk?place=${encodeURIComponent(d.name)}`); if (!r.ok) return null; const j = await r.json(); return [d.name, j.score as number] as const; } catch { return null; }
        })).then((rows) => { if (alive) setRisk(Object.fromEntries(rows.filter(Boolean) as [string, number][])); });
        return () => { alive = false; };
    }, [destinations]);
    return (
        <section className="py-20">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 text-center"
                >
                    <h2 className="mb-4 text-4xl md:text-5xl font-bold font-serif text-slate-900 dark:text-white">{title}</h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>
                </motion.div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {destinations.map((dest, index) => (
                        <motion.div
                            key={dest.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <DestinationCard {...dest} liveRisk={risk[dest.name]} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
