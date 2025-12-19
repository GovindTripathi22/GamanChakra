"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (address: string, lat?: number, lng?: number) => void;
    placeholder?: string;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface NominatimResult {
    display_name: string;
    lat: string;
    lon: string;
}

export function PlaceAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder,
    className,
    onKeyDown
}: PlaceAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounce fetch suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value.length > 2 && showSuggestions) {
                setLoading(true);
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`
                    );
                    const data = await response.json();
                    setSuggestions(data);
                } catch (error) {
                    console.error("Error fetching suggestions:", error);
                    setSuggestions([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [value, showSuggestions]);

    const handleSelect = (item: NominatimResult) => {
        // Extract a cleaner name (usually the first part of the display_name)
        const parts = item.display_name.split(",");
        const cityName = parts[0].trim();
        // Or keep the full name if preferred, but usually for trips "City" is better
        // Let's use the first 2 parts for context if available (e.g. "Paris, France")
        const formattedName = parts.length > 1 ? `${parts[0].trim()}, ${parts[parts.length - 1].trim()}` : item.display_name;

        onChange(formattedName);
        if (onSelect) {
            onSelect(formattedName, parseFloat(item.lat), parseFloat(item.lon));
        }
        setShowSuggestions(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Input
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    className={className}
                    onKeyDown={onKeyDown}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    {suggestions.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => handleSelect(item)}
                            className="flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                        >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span className="line-clamp-1 text-slate-700">
                                {item.display_name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
