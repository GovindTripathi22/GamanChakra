"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Hotel, DayItinerary } from "@/actions/generate-trip";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

// Fix Leaflet default icon issue
import L from "leaflet";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface MapViewProps {
    destination: string;
    hotels: Hotel[];
    itinerary: DayItinerary[];
}

export function MapView({ destination, hotels, itinerary }: MapViewProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

    if (!isMounted) {
        return <div className="h-[500px] w-full rounded-3xl bg-slate-100 animate-pulse" />;
    }

    return (
        <div className="h-[500px] w-full rounded-3xl overflow-hidden z-0 relative">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {points.map((point, idx) => (
                    <Marker
                        key={idx}
                        position={point.position}
                        icon={defaultIcon}
                    >
                        <Popup>
                            <div className="p-2 max-w-xs">
                                <h3 className="font-bold text-sm text-black">{point.title}</h3>
                                <p className="text-xs text-gray-600 mb-1">{point.type === 'hotel' ? 'Hotel' : 'Activity'}</p>
                                <p className="text-xs mb-1 text-black">{point.details}</p>
                                {point.price && <p className="text-xs font-semibold text-green-600">{point.price}</p>}
                                {point.time && <p className="text-xs font-semibold text-orange-600">{point.time}</p>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
