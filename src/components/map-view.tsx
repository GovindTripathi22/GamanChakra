"use client";

import { useEffect, useRef, useState } from "react";
import type { Hotel, DayItinerary } from "@/types/trip";

interface MapViewProps {
    destination: string;
    hotels: Hotel[];
    itinerary: DayItinerary[];
}

export function MapView({ destination, hotels, itinerary }: MapViewProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    interface Point {
        position: [number, number];
        title: string;
        type: "hotel" | "activity";
        details: string;
        price?: string;
        time?: string;
    }

    const points: Point[] = [];

    hotels.forEach(h => {
        if (h.geo_coordinates) {
            points.push({
                position: [h.geo_coordinates.lat, h.geo_coordinates.lng] as [number, number],
                title: h.name,
                type: "hotel",
                details: h.address,
                price: h.price
            });
        }
    });

    itinerary.forEach(day => {
        (day.activities || []).forEach(act => {
            const coords = act.coordinates || act.geo_coordinates;
            if (coords && (coords.lat !== 0 || coords.lng !== 0)) {
                points.push({
                    position: [coords.lat, coords.lng] as [number, number],
                    title: act.title || act.place_name || "Activity",
                    type: "activity",
                    details: act.description || act.details || "",
                    time: act.timeSlot || act.time
                });
            }
        });
    });

    const center: [number, number] = points.length > 0 ? points[0].position : [20.5937, 78.9629];

    useEffect(() => {
        // Skip if already initialized or no container
        if (!mapContainerRef.current) return;

        // Check if map already exists
        if (mapInstanceRef.current) {
            return;
        }

        let isCancelled = false;

        const initMap = async () => {
            try {
                const L = await import("leaflet");
                // @ts-ignore
                await import("leaflet/dist/leaflet.css");

                if (isCancelled || !mapContainerRef.current) return;

                // Double check container isn't already initialized
                if ((mapContainerRef.current as any)._leaflet_id) {
                    return;
                }

                const map = L.map(mapContainerRef.current).setView(center, 13);
                mapInstanceRef.current = map;

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }).addTo(map);

                const icon = L.icon({
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                points.forEach(point => {
                    const marker = L.marker(point.position, { icon }).addTo(map);
                    marker.bindPopup(`
                        <div style="padding: 8px; max-width: 200px;">
                            <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 4px 0;">${point.title}</h3>
                            <p style="font-size: 12px; color: #666; margin: 0 0 4px 0;">${point.type === 'hotel' ? 'Hotel' : 'Activity'}</p>
                            <p style="font-size: 12px; margin: 0 0 4px 0;">${point.details}</p>
                            ${point.price ? `<p style="font-size: 12px; color: green; font-weight: 600; margin: 0;">${point.price}</p>` : ''}
                            ${point.time ? `<p style="font-size: 12px; color: orange; font-weight: 600; margin: 0;">${point.time}</p>` : ''}
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.title + ' ' + destination)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:8px; font-size:11px; font-weight:700; color:#ea580c; text-decoration:none;">Open in Google Maps &rarr;</a>
                        </div>
                    `);
                });

                setIsLoading(false);
            } catch (error) {
                console.error("Failed to initialize map:", error);
            }
        };

        initMap();

        return () => {
            isCancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [destination]); // Only reinitialize when destination changes

    return (
        <div className="h-[500px] w-full rounded-3xl overflow-hidden z-0 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
                    <span className="text-slate-500 dark:text-slate-400">Loading map...</span>
                </div>
            )}
            {/* Google Maps Route Button */}
            <div className="absolute top-4 right-4 z-[400]">
                <button
                    onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
                        window.open(url, "_blank");
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md transition-all hover:bg-white hover:text-orange-600 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:text-orange-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                    <svg className="h-3.5 w-3.5 text-orange-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <span>Open in Google Maps ↗</span>
                </button>
            </div>
            <div ref={mapContainerRef} className="h-full w-full" />
        </div>
    );
}
