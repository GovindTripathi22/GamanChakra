import type { FlightStatusResult } from "../types";
import { findPlace, haversineKm } from "@/lib/geo/gazetteer";

export interface FlightQueryOptions {
  originAirport?: string;
  destinationAirport?: string;
  departureDate?: string;
}

const AIRLINE_PREFIXES: Record<string, string> = {
  "6E": "IndiGo",
  "AI": "Air India",
  "UK": "Vistara",
  "SG": "SpiceJet",
  "QP": "Akasa Air",
  "IX": "Air India Express",
  "EK": "Emirates",
  "QR": "Qatar Airways",
  "SQ": "Singapore Airlines",
  "BA": "British Airways",
  "LH": "Lufthansa",
};

const DEFAULT_CORRIDORS: Array<{ from: string; to: string; term: string }> = [
  { from: "DEL", to: "BOM", term: "T3" },
  { from: "DEL", to: "BLR", term: "T3" },
  { from: "DEL", to: "GOI", term: "T3" },
  { from: "BOM", to: "BLR", term: "T2" },
  { from: "BOM", to: "GOI", term: "T2" },
  { from: "DEL", to: "CCU", term: "T3" },
  { from: "BLR", to: "MAA", term: "T1" },
  { from: "DEL", to: "HYD", term: "T3" },
];

/**
 * Labeled Mock Flight Provider enriched with Haversine flight physics
 * Principle P2 Compliance: Visible [Demo data] badge attached to output
 */
export async function getFlightStatus(
  flightNumber: string,
  options?: FlightQueryOptions
): Promise<FlightStatusResult> {
  const cleanNo = flightNumber.toUpperCase().replace(/\s+/g, "");
  const prefix = cleanNo.slice(0, 2);
  const airline = AIRLINE_PREFIXES[prefix] || "Commercial Airline";

  // Derive corridor from options or deterministic hash of flight number
  let depCode = options?.originAirport?.toUpperCase();
  let arrCode = options?.destinationAirport?.toUpperCase();
  let terminal = "T3";

  if (!depCode || !arrCode) {
    const hash = cleanNo.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 13), 0);
    const corridor = DEFAULT_CORRIDORS[hash % DEFAULT_CORRIDORS.length];
    depCode = depCode || corridor.from;
    arrCode = arrCode || corridor.to;
    terminal = corridor.term;
  }

  // Calculate distance using Haversine formula from gazetteer
  const depPlace = findPlace(depCode);
  const arrPlace = findPlace(arrCode);
  let distanceKm = 1150; // Standard metro domestic average

  if (depPlace && arrPlace) {
    distanceKm = haversineKm(
      { lat: depPlace.lat, lng: depPlace.lng },
      { lat: arrPlace.lat, lng: arrPlace.lng }
    );
  }

  // Realistic duration: Cruise speed ~720 km/h + 45 min ground taxi, climb, descent
  const flightDurationMinutes = Math.max(45, Math.round((distanceKm / 720) * 60) + 45);

  // Distance-indexed Indian domestic fare calculation (Base ₹2,400 + ₹4.35/km)
  const estimatedFareAmount = Math.round((2400 + distanceKm * 4.35) / 50) * 50;

  const now = new Date().toISOString();

  return {
    flightNumber: cleanNo,
    airline,
    departureAirport: depCode,
    arrivalAirport: arrCode,
    scheduledDeparture: "14:15",
    estimatedDeparture: "14:15",
    delayMinutes: 0,
    status: "on_time",
    terminal,
    gate: "42B",
    distanceKm,
    flightDurationMinutes,
    estimatedFare: {
      amount: estimatedFareAmount,
      currency: "₹",
    },
    provenance: {
      source: `Simulated Aviation GDS (Haversine Route ${depCode}->${arrCode}, ${distanceKm} km)`,
      lastCheckedAt: now,
      status: "estimated",
      isMock: true,
      confidence: 0.75,
    },
  };
}
