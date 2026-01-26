"use client";

import { motion } from "framer-motion";
import { DestinationCard } from "./destination-card";

interface Destination {
    name: string;
    image: string;
    description: string;
    price: string;
    slug: string;
}

interface DestinationSectionProps {
    title: string;
    subtitle: string;
    destinations: Destination[];
}

export function DestinationSection({ title, subtitle, destinations }: DestinationSectionProps) {
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
                    <h2 className="mb-4 text-4xl font-bold font-serif text-slate-900 dark:text-white">{title}</h2>
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
                            <DestinationCard {...dest} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
