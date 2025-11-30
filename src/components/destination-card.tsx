"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

interface DestinationCardProps {
    name: string;
    image: string;
    description: string;
    price: string;
    slug: string;
}

export function DestinationCard({ name, image, description, price, slug }: DestinationCardProps) {
    return (
        <Link href={`/destination/${slug}`}>
            <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative h-[450px] w-full overflow-hidden rounded-3xl cursor-pointer shadow-xl"
            >
                <Image
                    src={image}
                    alt={name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-90" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-6 text-white transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="mb-3 flex items-center gap-2 opacity-0 transform translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                        <div className="rounded-full bg-orange-500/20 px-3 py-1 backdrop-blur-md border border-orange-500/30">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-orange-400" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                                    Top Pick
                                </span>
                            </div>
                        </div>
                    </div>

                    <h3 className="mb-2 text-3xl font-bold font-serif text-white drop-shadow-lg">{name}</h3>

                    <p className="mb-6 text-sm text-gray-300 line-clamp-2 leading-relaxed opacity-90">
                        {description}
                    </p>

                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Starting from</span>
                            <span className="text-xl font-bold text-orange-400">{price}</span>
                        </div>

                        <button className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold backdrop-blur-md border border-white/20 transition-all hover:bg-orange-500 hover:border-orange-500 hover:text-white group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                            Explore
                        </button>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
