"use client";

import { useEffect, useState, useId } from "react";
import type { Hotel, DayItinerary } from "@/actions/generate-trip";

interface MapViewProps {
    destination: string;
    hotels: Hotel[];
    itinerary: DayItinerary[];
}

// Use a completely separate component that is only rendered client-side
function MapViewInner({ hotels, itinerary }: { hotels: Hotel[]; itinerary: DayItinerary[] }) {
    const [mapComponents, setMapComponents] = useState<any>(null);
    const [mapIcon, setMapIcon] = useState<any>(null);
    const mapId = useId();

    useEffect(() => {
        // Dynamically import everything on client side only
        Promise.all([
            import("leaflet"),
            import("react-leaflet"),
            import("leaflet/dist/leaflet.css")
        ]).then(([L, RL]) => {
            const icon = L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            setMapIcon(icon);
            setMapComponents({
                MapContainer: RL.MapContainer,
                TileLayer: RL.TileLayer,
                Marker: RL.Marker,
                Popup: RL.Popup
            });
        });
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

    if (!mapComponents || !mapIcon) {
        return <div className="h-[500px] w-full rounded-3xl bg-slate-100 animate-pulse" />;
    }

    const { MapContainer, TileLayer, Marker, Popup } = mapComponents;

    return (
        <div id={mapId} className="h-[500px] w-full rounded-3xl overflow-hidden z-0 relative">
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
                        key={`marker-${idx}`}
                        position={point.position}
                        icon={mapIcon}
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

export function MapView({ destination, hotels, itinerary }: MapViewProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-[500px] w-full rounded-3xl bg-slate-100 animate-pulse" />;
    }

    // Use key based on destination to force fresh mount when data changes
    return <MapViewInner key={destination} hotels={hotels} itinerary={itinerary} />;
}
