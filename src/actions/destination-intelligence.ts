"use server";

import {
  getDestinationIntelligence,
  calculateSeasonalForecast,
  simulateDestinationScenario,
} from "@/lib/destination-intelligence/analytics";

export async function getDestinationIntelligenceAction(destination?: string) {
  return await getDestinationIntelligence(destination);
}

export async function getSeasonalForecastAction(destination: string) {
  return calculateSeasonalForecast(destination);
}

export async function runMacroScenarioSimulationAction(
  destination: string,
  scenario: "festival_surge" | "monsoon_flood" | "transit_strike" | "heatwave"
) {
  return await simulateDestinationScenario(destination, scenario);
}
