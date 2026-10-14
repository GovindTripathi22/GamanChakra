import type { ProviderCapabilityDeclaration } from "./types";

/**
 * Provider Capability Registry (Section 5.C)
 * Declares supported capabilities, freshness, reliability, and mock status
 */
export const PROVIDER_REGISTRY: Record<string, ProviderCapabilityDeclaration> = {
  "open-meteo": {
    providerId: "open-meteo",
    name: "Open-Meteo Global Meteorological API",
    isMock: false,
    capabilities: ["weather_forecast", "status_feed"],
    freshnessSeconds: 900, // 15 mins
    reliabilityScore: 0.98,
    sourceLabel: "Open-Meteo Live API (Free & Open)",
  },
  "osrm-routing": {
    providerId: "osrm-routing",
    name: "Project OSRM Transit Engine",
    isMock: false,
    capabilities: ["transit_routing"],
    freshnessSeconds: 86400, // road network static daily
    reliabilityScore: 0.96,
    sourceLabel: "Project OSRM Live Road Network",
  },
  "osm-nominatim": {
    providerId: "osm-nominatim",
    name: "OpenStreetMap Nominatim Geocoder",
    isMock: false,
    capabilities: ["place_lookup"],
    freshnessSeconds: 86400,
    reliabilityScore: 0.95,
    sourceLabel: "OpenStreetMap Nominatim Live",
  },
  "indian-railways": {
    providerId: "indian-railways",
    name: "Indian Railways Public Timetable Database",
    isMock: false,
    capabilities: ["rail_schedule", "alternatives"],
    freshnessSeconds: 3600,
    reliabilityScore: 0.98,
    sourceLabel: "Indian Railways Timetable Dataset",
  },
  "mock-flight-status": {
    providerId: "mock-flight-status",
    name: "Simulated Aviation GDS",
    isMock: true,
    capabilities: ["status_feed", "alternatives"],
    freshnessSeconds: 300,
    reliabilityScore: 0.7,
    sourceLabel: "Simulated Flight Provider [Demo data]",
  },
  "mock-stays": {
    providerId: "mock-stays",
    name: "Simulated Hospitality Inventory",
    isMock: true,
    capabilities: ["price_check", "alternatives"],
    freshnessSeconds: 3600,
    reliabilityScore: 0.7,
    sourceLabel: "Simulated Hospitality Provider [Demo data]",
  },
};

export function getProviderDeclaration(providerId: string): ProviderCapabilityDeclaration | null {
  return PROVIDER_REGISTRY[providerId] || null;
}

export function listSupportedProviders(): ProviderCapabilityDeclaration[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getProvidersByCapability(capability: string): ProviderCapabilityDeclaration[] {
  return Object.values(PROVIDER_REGISTRY).filter((p) =>
    p.capabilities.includes(capability as any)
  );
}
