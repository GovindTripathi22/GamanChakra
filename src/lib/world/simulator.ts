export interface SimulationScenarioInput {
  scenarioId: "winter_fog_del" | "monsoon_nh66_washout" | "delhi_jaipur_rail_block" | "goa_new_year_surge";
  severity?: "moderate" | "severe" | "catastrophic";
}

export interface SimulationScenarioResult {
  scenarioName: string;
  affectedHubs: string[];
  affectedRoutesCount: number;
  expectedDelayMinutes: number;
  capacityReductionPercent: number;
  disruptionType: "weather" | "infrastructure" | "congestion";
  cascadingImpactSummary: string;
  recommendedMitigations: Array<{
    title: string;
    alternativeMode: "rail" | "road" | "air" | "reschedule";
    tradeOff: string;
    feasibilityScore: number; // 0 - 100
  }>;
  assumptions: string[];
  simulatedAt: string;
}

export const PRESET_SCENARIOS: Record<string, {
  name: string;
  hubs: string[];
  type: "weather" | "infrastructure" | "congestion";
  baseDelay: number;
  baseCapDrop: number;
  summary: string;
  mitigations: Array<{
    title: string;
    alternativeMode: "rail" | "road" | "air" | "reschedule";
    tradeOff: string;
    feasibilityScore: number;
  }>;
  assumptions: string[];
}> = {
  winter_fog_del: {
    name: "Indira Gandhi International (DEL) Winter Fog CAT-IIIb Low-Visibility",
    hubs: ["DEL", "NDLS", "JAI"],
    type: "weather",
    baseDelay: 210,
    baseCapDrop: 75,
    summary: "Dense fog reduces runway visual range (RVR) below 150m. Over 80 outbound flights delayed or diverted. Airport road approaches congested.",
    mitigations: [
      {
        title: "Pivot to Vande Bharat Express (NDLS -> JP)",
        alternativeMode: "rail",
        tradeOff: "Transit takes 3h 45m instead of 55m flight, but 94% on-time during fog",
        feasibilityScore: 92,
      },
      {
        title: "Delay departure by 4 hours to afternoon clear-window (after 1:00 PM)",
        alternativeMode: "reschedule",
        tradeOff: "Maintains flight comfort; cuts daytime activities in destination",
        feasibilityScore: 84,
      },
    ],
    assumptions: [
      "Based on IMD Delhi Palam winter morning fog climatology (Dec-Jan).",
      "Vande Bharat rakes operate with Kavach or fog-pass signaling devices.",
    ],
  },
  monsoon_nh66_washout: {
    name: "Konkan Highway (NH-66) Landslide & Flash Flooding",
    hubs: ["MUMBAI", "GOA", "CSMT", "MAO"],
    type: "infrastructure",
    baseDelay: 320,
    baseCapDrop: 60,
    summary: "Monsoon torrential downpours trigger mudslides on Kashedi/Parshuram Ghats. Intercity bus operations suspended.",
    mitigations: [
      {
        title: "Switch to Konkan Railway Jan Shatabdi / Tejas Express (CSMT -> MAO)",
        alternativeMode: "rail",
        tradeOff: "Operates on reinforced track beds with monsoon speed restrictions (+45m)",
        feasibilityScore: 89,
      },
      {
        title: "Direct BOM -> GOI flight backup",
        alternativeMode: "air",
        tradeOff: "Adds ₹3,500/traveler flight fare premium; avoids road block completely",
        feasibilityScore: 95,
      },
    ],
    assumptions: [
      "Data grounded in National Disaster Management Authority (NDMA) Konkan reports.",
      "Konkan Railway operates under monsoon timetable schedule.",
    ],
  },
  delhi_jaipur_rail_block: {
    name: "Delhi-Jaipur Railway Corridor Non-Interlocking Track Maintenance",
    hubs: ["NDLS", "JP", "DELHI", "JAIPUR"],
    type: "infrastructure",
    baseDelay: 150,
    baseCapDrop: 45,
    summary: "Track modernization work around Rewari-Alwar section cancels 8 daily express trains and regulates remaining services.",
    mitigations: [
      {
        title: "Pre-booked Verified Intercity Electric Cab via NE-4 Expressway",
        alternativeMode: "road",
        tradeOff: "4h smooth expressway drive with doorstep pickup; costs ₹3,200 total cab",
        feasibilityScore: 94,
      },
      {
        title: "Rajasthan Roadways RSRTC Volvo AC Express (ISBT Kashmere Gate)",
        alternativeMode: "road",
        tradeOff: "Frequent 30-min departures; takes 4h 30m; ₹850/seat",
        feasibilityScore: 88,
      },
    ],
    assumptions: [
      "Delhi-Mumbai Expressway section fully operational at 120 km/h speed limit.",
      "Verified cab rates benchmarked against Rajasthan taxi union tariff.",
    ],
  },
  goa_new_year_surge: {
    name: "North Goa Peak Festival & New Year Demand Bottleneck",
    hubs: ["GOA", "GOI", "GOX", "MAO"],
    type: "congestion",
    baseDelay: 90,
    baseCapDrop: 30,
    summary: "Extreme visitor influx causes 3x airport taxi fare surge and severe bumper-to-bumper delays on Panaji-Calangute bridge.",
    mitigations: [
      {
        title: "Pre-book GoaMiles / Kadamba Electric Airport Shuttle",
        alternativeMode: "road",
        tradeOff: "Fixed government tariff (saves ~₹1,800 vs spot union taxi); fixed pickup bay",
        feasibilityScore: 91,
      },
      {
        title: "Shift accommodation stay to South Goa (Benaulim / Palolem) with North day-trips",
        alternativeMode: "reschedule",
        tradeOff: "50% lower accommodation rate; quieter beaches; 45m taxi to North clubs",
        feasibilityScore: 86,
      },
    ],
    assumptions: [
      "Historical Goa Tourism Department holiday peak occupancy data.",
      "Kadamba EV airport buses operate on 45-minute headway.",
    ],
  },
};

/**
 * Execute scenario simulation to evaluate system resilience under acute disruption
 */
export function runScenarioSimulation(input: SimulationScenarioInput): SimulationScenarioResult {
  const preset = PRESET_SCENARIOS[input.scenarioId] || PRESET_SCENARIOS.winter_fog_del;
  const severityMultiplier = input.severity === "catastrophic" ? 1.5 : input.severity === "moderate" ? 0.8 : 1.0;

  return {
    scenarioName: preset.name,
    affectedHubs: preset.hubs,
    affectedRoutesCount: preset.hubs.length * 2,
    expectedDelayMinutes: Math.round(preset.baseDelay * severityMultiplier),
    capacityReductionPercent: Math.min(95, Math.round(preset.baseCapDrop * severityMultiplier)),
    disruptionType: preset.type,
    cascadingImpactSummary: preset.summary,
    recommendedMitigations: preset.mitigations,
    assumptions: preset.assumptions,
    simulatedAt: new Date().toISOString(),
  };
}
