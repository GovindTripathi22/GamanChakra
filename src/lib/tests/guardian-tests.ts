import { GeneratedTrip } from "@/types/trip";
import { scanTripForDisruptions } from "../guardian/monitor";
import { approveAndExecuteRecoveryAction } from "@/actions/guardian";
import { PRESET_DISRUPTIONS } from "../disruption-simulator";
import { TestResult } from "./contract-tests";

export async function runAllGuardianTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  const sampleTrip: GeneratedTrip = {
    trip_details: {
      destination: "Goa",
      duration: "3 days",
      budget: "standard",
      vibe: "beach & relaxation",
      total_estimated_cost: "₹25,000",
    },
    transportation_plan: [
      {
        mode: "Flight",
        details: "IndiGo 6E-204 to Goa Dabolim",
        estimated_cost: "₹4,500",
        duration: "2h 30m",
      },
    ],
    hotels: [
      {
        name: "Goa Coastal Beach Resort",
        address: "Calangute, Goa",
        price: "₹4,200/night",
        image_query: "goa resort",
        rating: 4.6,
      },
    ],
    itinerary: [
      {
        day: 1,
        theme: "Arrival & Coastal Exploration",
        activities: [
          {
            id: "act-g-1",
            timeSlot: "11:00 AM - 01:30 PM",
            startTime: "11:00",
            endTime: "13:30",
            title: "Baga Beach Watersports & Shacks",
            description: "Jet ski and beach parasailing",
            category: "leisure",
            locationName: "Baga Beach",
            coordinates: { lat: 15.5553, lng: 73.7517 },
          },
          {
            id: "act-g-2",
            timeSlot: "03:00 PM - 05:30 PM",
            startTime: "15:00",
            endTime: "17:30",
            title: "Aguada Fort Sunset Walk",
            description: "17th-century Portuguese lighthouse",
            category: "sightseeing",
            locationName: "Sinquerim",
            coordinates: { lat: 15.4925, lng: 73.7735 },
          },
        ],
      },
    ],
  };

  // TEST 1: Flight Delay Simulation (+180 mins)
  {
    const start = Date.now();
    try {
      const flightPreset = PRESET_DISRUPTIONS.find((p) => p.id === "disrupt-flight-3h") || PRESET_DISRUPTIONS[0];
      const result = await scanTripForDisruptions(sampleTrip, "test-trip-guardian", flightPreset);

      const passed =
        result.hasDisruption === true &&
        result.recoveryOptions.length >= 2 &&
        result.recoveryOptions[0].strategy === "reorder" &&
        result.recoveryOptions[0].updatedActivities.length > 0;

      results.push({
        suite: "Trip Guardian",
        testName: "Flight delay simulation generates >= 2 ranked recovery options",
        passed,
        durationMs: Date.now() - start,
        details: `Disruption: ${result.activeDisruption?.title}, Generated ${result.recoveryOptions.length} options (Top: ${result.recoveryOptions[0].title})`,
      });
    } catch (e: any) {
      results.push({
        suite: "Trip Guardian",
        testName: "Flight delay simulation generates >= 2 ranked recovery options",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 2: Torrential Rain Weather Shock
  {
    const start = Date.now();
    try {
      const rainPreset = PRESET_DISRUPTIONS.find((p) => p.type === "weather") || PRESET_DISRUPTIONS[1];
      const result = await scanTripForDisruptions(sampleTrip, "test-trip-guardian", rainPreset);

      const shelteredOption = result.recoveryOptions.find((o) => o.strategy === "substitute");
      const passed =
        result.hasDisruption === true &&
        shelteredOption !== undefined &&
        shelteredOption.title.includes("Sheltered Indoor");

      results.push({
        suite: "Trip Guardian",
        testName: "Weather shock triggers indoor cultural shelter substitution",
        passed,
        durationMs: Date.now() - start,
        details: shelteredOption ? `Option: ${shelteredOption.title} (Cost delta: ₹${shelteredOption.costDelta.amount})` : "Not found",
      });
    } catch (e: any) {
      results.push({
        suite: "Trip Guardian",
        testName: "Weather shock triggers indoor cultural shelter substitution",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 3: L2 One-Tap Approval & Audit Enforcement
  {
    const start = Date.now();
    try {
      const flightPreset = PRESET_DISRUPTIONS[0];
      const scan = await scanTripForDisruptions(sampleTrip, "test-trip-guardian", flightPreset);
      const chosenOption = scan.recoveryOptions[0];

      const execution = await approveAndExecuteRecoveryAction("test-trip-guardian", chosenOption, "traveler_test");
      const passed =
        execution.success === true &&
        execution.policyDecision.effectiveAutonomyLevel === "L2" &&
        execution.policyDecision.decision === "executed";

      results.push({
        suite: "Trip Guardian",
        testName: "L2 one-tap approval is authorized and committed to audit trail",
        passed,
        durationMs: Date.now() - start,
        details: `Decision: ${execution.policyDecision.decision}, Level: ${execution.policyDecision.effectiveAutonomyLevel}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Trip Guardian",
        testName: "L2 one-tap approval is authorized and committed to audit trail",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
