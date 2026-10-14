"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Globe to avoid SSR issues
const GlobeGl = dynamic(() => import("react-globe.gl"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
        </div>
    ),
});

interface GlobeProps {
    center?: { lat: number; lng: number };
}

export function Globe({ center }: GlobeProps) {
    const globeRef = useRef<any>(undefined);
    const [globeReady, setGlobeReady] = useState(false);

    useEffect(() => {
        if (globeRef.current && center) {
            globeRef.current.pointOfView({
                lat: center.lat,
                lng: center.lng,
                altitude: 1.5, // Zoom level
            }, 2000); // Animation duration in ms
        }
    }, [center, globeReady]);

    return (
        <div className="relative h-full w-full overflow-hidden rounded-3xl bg-slate-900">
            <GlobeGl
                ref={globeRef}
                onGlobeReady={() => setGlobeReady(true)}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                atmosphereColor="#3a228a"
                atmosphereAltitude={0.2}
                width={800} // Ensure it takes up space, CSS will handle responsiveness
                height={800}
            />
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none z-10">
                <h3 className="text-xl font-bold text-white mb-1">Interactive 3D Globe</h3>
                <p className="text-slate-400 text-sm">
                    {center ? "Zooming to location..." : "Explore the World"}
                </p>
            </div>
        </div>
    );
}
