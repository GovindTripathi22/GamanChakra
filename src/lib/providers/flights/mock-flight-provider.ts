import type { FlightStatusResult } from "../types";

/**
 * Labeled Mock Flight Provider
 * Explicit Principle P2 Compliance: Visible [Demo data] badge attached to output
 */
export async function getFlightStatus(
  flightNumber: string
): Promise<FlightStatusResult> {
  const now = new Date().toISOString();

  return {
    flightNumber: flightNumber.toUpperCase(),
    airline: flightNumber.startsWith("6E") ? "IndiGo" : flightNumber.startsWith("AI") ? "Air India" : "Commercial Airline",
    departureAirport: "DEL",
    arrivalAirport: "GOI",
    scheduledDeparture: "14:15",
    estimatedDeparture: "14:15",
    delayMinutes: 0,
    status: "on_time",
    terminal: "T3",
    gate: "42B",
    provenance: {
      source: "Simulated Aviation GDS (Mock Provider)",
      lastCheckedAt: now,
      status: "estimated",
      isMock: true,
      confidence: 0.65,
    },
  };
}
