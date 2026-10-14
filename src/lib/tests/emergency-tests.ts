import { scanRouteHazards } from "../emergency/risk-scanner";
import { getEmergencyDirectory, ALL_INDIA_HELPLINES } from "../emergency/directory";
import { getOfflineEmergencyCard } from "@/actions/emergency";

export interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
  durationMs: number;
  details?: string;
}

export async function runAllEmergencyTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // TEST 1: Monsoon & Landslide Risk Scan on Western Ghats in July
  {
    const start = Date.now();
    try {
      const risk = await scanRouteHazards({
        destination: "Goa (Western Ghats Corridor)",
        travelMonth: 7, // July
      });

      const monsoonHazard = risk.hazards.find((h) => h.type === "monsoon_landslide");
      if (!monsoonHazard) {
        throw new Error("Expected monsoon_landslide hazard to be detected for Western Ghats in July");
      }

      if (monsoonHazard.bufferAdjustmentMinutes < 90) {
        throw new Error(`Expected buffer adjustment >= 90 min, got ${monsoonHazard.bufferAdjustmentMinutes}`);
      }

      if (risk.overallRiskLevel !== "high" && risk.overallRiskLevel !== "extreme") {
        throw new Error(`Expected high/extreme overall risk, got ${risk.overallRiskLevel}`);
      }

      if (!risk.packingChecklist.some(p => p.toLowerCase().includes("waterproof") || p.toLowerCase().includes("rain"))) {
        throw new Error("Packing checklist missing rain/waterproof gear");
      }

      results.push({
        suite: "Emergency & Route Risk",
        testName: "Flags high monsoon/landslide hazard with >=90m buffer for Western Ghats in July",
        passed: true,
        durationMs: Date.now() - start,
        details: `Hazard: ${monsoonHazard.title}, Buffer: +${monsoonHazard.bufferAdjustmentMinutes}m, Severity: ${monsoonHazard.severity}`,
      });
    } catch (err: any) {
      results.push({
        suite: "Emergency & Route Risk",
        testName: "Flags high monsoon/landslide hazard with >=90m buffer for Western Ghats in July",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 2: Winter Air Quality / Smog Hazard in North India (Delhi/Varanasi) in December
  {
    const start = Date.now();
    try {
      const risk = await scanRouteHazards({
        destination: "Varanasi (North India Plain)",
        travelMonth: 12, // December
      });

      const aqiHazard = risk.hazards.find((h) => h.type === "air_quality");
      if (!aqiHazard) {
        throw new Error("Expected air_quality hazard in North India in December");
      }

      if (!risk.packingChecklist.some(p => p.includes("N95"))) {
        throw new Error("Packing list should mandate N95 masks for winter North India");
      }

      results.push({
        suite: "Emergency & Route Risk",
        testName: "Detects winter high-AQI smog hazard in North India with N95 mask requirement",
        passed: true,
        durationMs: Date.now() - start,
        details: `Hazard: ${aqiHazard.title}, Recommended Buffer: +${aqiHazard.bufferAdjustmentMinutes}m`,
      });
    } catch (err: any) {
      results.push({
        suite: "Emergency & Route Risk",
        testName: "Detects winter high-AQI smog hazard in North India with N95 mask requirement",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 3: Verified 24x7 Facilities & Helplines in Emergency Directory
  {
    const start = Date.now();
    try {
      const goaDir = getEmergencyDirectory("Goa");
      const jaipurDir = getEmergencyDirectory("Jaipur");

      if (!goaDir.hospital.open24x7 || !goaDir.hospital.phone) {
        throw new Error("Goa hospital must be open 24x7 with verified phone");
      }

      if (!jaipurDir.hospital.open24x7 || !jaipurDir.hospital.phone) {
        throw new Error("Jaipur hospital must be open 24x7 with verified phone");
      }

      if (!ALL_INDIA_HELPLINES.some(h => h.number === "112")) {
        throw new Error("All-India 112 emergency helpline must be present");
      }

      results.push({
        suite: "Emergency & Route Risk",
        testName: "Resolves verified 24x7 trauma hospitals and national emergency numbers",
        passed: true,
        durationMs: Date.now() - start,
        details: `Hospital: ${goaDir.hospital.name} (${goaDir.hospital.phone})`,
      });
    } catch (err: any) {
      results.push({
        suite: "Emergency & Route Risk",
        testName: "Resolves verified 24x7 trauma hospitals and national emergency numbers",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 4: Local Phrasebook Matches Destination Language
  {
    const start = Date.now();
    try {
      const goaDir = getEmergencyDirectory("Goa");
      const parisDir = getEmergencyDirectory("Paris");
      const tokyoDir = getEmergencyDirectory("Tokyo");

      const konkaniHelp = goaDir.phrases.find(p => p.intent === "emergency_help");
      if (!konkaniHelp || konkaniHelp.language !== "Konkani" || !konkaniHelp.nativeScript) {
        throw new Error("Goa directory must provide Konkani emergency phrase with native script");
      }

      const frenchHelp = parisDir.phrases.find(p => p.intent === "emergency_help");
      if (!frenchHelp || frenchHelp.language !== "French") {
        throw new Error("Paris directory must provide French emergency phrase");
      }

      const japaneseHelp = tokyoDir.phrases.find(p => p.intent === "emergency_help");
      if (!japaneseHelp || japaneseHelp.language !== "Japanese") {
        throw new Error("Tokyo directory must provide Japanese emergency phrase");
      }

      results.push({
        suite: "Emergency & Route Risk",
        testName: "Provides phonetically accurate phrases in destination language (Konkani, French, Japanese)",
        passed: true,
        durationMs: Date.now() - start,
        details: `Konkani: "${konkaniHelp.nativeScript}" (${konkaniHelp.phonetic}), French: "${frenchHelp.nativeScript}"`,
      });
    } catch (err: any) {
      results.push({
        suite: "Emergency & Route Risk",
        testName: "Provides phonetically accurate phrases in destination language (Konkani, French, Japanese)",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 5: Complete Offline Emergency Card Generation & Provenance (P1)
  {
    const start = Date.now();
    try {
      const card = await getOfflineEmergencyCard("trip-demo-77", "Goa");

      if (!card.nearestHospital || !card.nearestPolice || card.phrases.length === 0) {
        throw new Error("Emergency card missing essential components");
      }

      if (!card.provenance || card.provenance.status !== "verified") {
        throw new Error("Emergency card must have verified provenance (P1)");
      }

      results.push({
        suite: "Emergency & Route Risk",
        testName: "Generates offline-ready emergency card with verified provenance (P1)",
        passed: true,
        durationMs: Date.now() - start,
        details: `Provenance: ${card.provenance.source}, CacheKey: ${card.offlineCacheKey}`,
      });
    } catch (err: any) {
      results.push({
        suite: "Emergency & Route Risk",
        testName: "Generates offline-ready emergency card with verified provenance (P1)",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}
