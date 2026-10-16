/**
 * Provider Adapter Contracts & Capability Declarations
 * Principle P1 (Provenance), P2 (Labeled demo data), P5 (Data neutrality)
 */

export type Capability =
  | "status_feed"
  | "alternatives"
  | "booking_handoff"
  | "refund_info"
  | "price_check"
  | "place_lookup"
  | "weather_forecast"
  | "transit_routing"
  | "rail_schedule";

export interface ProviderCapabilityDeclaration {
  providerId: string;
  name: string;
  isMock: boolean;
  capabilities: Capability[];
  freshnessSeconds: number;
  reliabilityScore: number; // 0.0 to 1.0
  sourceLabel: string;
}

export interface FactProvenance {
  source: string;
  lastCheckedAt: string;
  status: "verified" | "estimated" | "unverified";
  isMock: boolean;
  confidence?: number;
}

// Weather Contract (Open-Meteo live or labeled mock)
export interface WeatherForecastResult {
  temperatureC: number;
  apparentTemperatureC: number;
  condition: string;
  weatherCode: number;
  precipitationProbability: number; // 0 - 100%
  precipitationMm: number;
  isMonsoonAlert: boolean;
  monsoonSeverity?: "none" | "moderate" | "torrential";
  provenance: FactProvenance;
}

// Transit & Routing Contract (Project OSRM live or labeled mock)
export interface TransitRoutingResult {
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
  mode: "driving" | "walking" | "transit";
  originCoordinates: { lat: number; lng: number };
  destinationCoordinates: { lat: number; lng: number };
  provenance: FactProvenance;
}

// Place Resolution Contract (OSM Nominatim live or labeled mock)
export interface PlaceResolutionResult {
  name: string;
  displayName: string;
  placeRef: string;
  coordinates: { lat: number; lng: number };
  category?: string;
  osmType?: string;
  provenance: FactProvenance;
}

// Rail Schedule Contract (Indian Railways schedule dataset & waitlist heuristic)
export interface TrainScheduleResult {
  trainNumber: string;
  trainName: string;
  originStation: string;
  destinationStation: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  classes: string[];
  daysOfRun: string[];
  waitlistConfirmationChance?: number; // 0 - 100%
  waitlistSampleSize?: number;
  waitlistStatusLabel?: "High probability" | "Medium probability" | "Rough estimate (low data)";
  provenance: FactProvenance;
}

// Flight Status Contract (Labeled mock provider with [Demo data] badge)
export interface FlightStatusResult {
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  scheduledDeparture: string;
  estimatedDeparture: string;
  delayMinutes: number;
  status: "on_time" | "delayed" | "cancelled";
  gate?: string;
  terminal?: string;
  distanceKm?: number;
  flightDurationMinutes?: number;
  estimatedFare?: {
    amount: number;
    currency: string;
  };
  provenance: FactProvenance;
}
