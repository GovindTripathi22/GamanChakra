"use client";

import { useEffect, useRef, useState } from "react";
import type { Hotel, DayItinerary } from "@/actions/generate-trip";

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
        day.activities.forEach(act => {
            if (act.geo_coordinates && (act.geo_coordinates.lat !== 0 || act.geo_coordinates.lng !== 0)) {
                points.push({
                    position: [act.geo_coordinates.lat, act.geo_coordinates.lng] as [number, number],
                    title: act.place_name,
                    type: "activity",
                    details: act.details,
                    time: act.time
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
                <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
                    <span className="text-slate-500">Loading map...</span>
                </div>
            )}
            <div ref={mapContainerRef} className="h-full w-full" />
        </div>
    );
}
