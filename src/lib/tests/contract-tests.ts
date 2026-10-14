import { fetchLiveWeather } from "../providers/weather/open-meteo-provider";
import { calculateTransitRoute } from "../providers/routing/osrm-provider";
import { resolvePlace } from "../providers/places/nominatim-provider";
import { getTrainSchedule, estimateWaitlistConfirmation } from "../providers/trains/rail-provider";
import { getFlightStatus } from "../providers/flights/mock-flight-provider";
import { authorizeAction, DEFAULT_USER_POLICY } from "../policy/engine";

export interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

export async function runAllContractTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // TEST 1: Open-Meteo Live Weather
  {
    const start = Date.now();
    try {
      const weather = await fetchLiveWeather(26.9124, 75.7873); // Jaipur
      const valid =
        typeof weather.temperatureC === "number" &&
        weather.provenance !== undefined &&
        (weather.provenance.status === "verified" || weather.provenance.status === "estimated");
      results.push({
        suite: "Weather Provider",
        testName: "Open-Meteo fetches valid temperature and provenance",
        passed: valid,
        durationMs: Date.now() - start,
        details: `Temp: ${weather.temperatureC}°C, Condition: ${weather.condition}, Source: ${weather.provenance.source}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Weather Provider",
        testName: "Open-Meteo fetches valid temperature and provenance",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 2: Project OSRM Live Transit Routing
  {
    const start = Date.now();
    try {
      const route = await calculateTransitRoute(
        { lat: 28.6139, lng: 77.209 }, // New Delhi
        { lat: 26.9124, lng: 75.7873 }, // Jaipur
        "driving"
      );
      const valid =
        route.distanceMeters > 200000 && // > 200 km
        route.durationMinutes > 180 &&
        route.provenance !== undefined;
      results.push({
        suite: "Routing Provider",
        testName: "OSRM computes realistic Delhi-Jaipur transit distance & duration",
        passed: valid,
        durationMs: Date.now() - start,
        details: `Distance: ${(route.distanceMeters / 1000).toFixed(1)} km, Duration: ${route.durationMinutes} mins`,
      });
    } catch (e: any) {
      results.push({
        suite: "Routing Provider",
        testName: "OSRM computes realistic Delhi-Jaipur transit distance & duration",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 3: OSM Nominatim Place Resolution
  {
    const start = Date.now();
    try {
      const place = await resolvePlace("Hawa Mahal, Jaipur");
      const valid =
        place !== null &&
        typeof place.coordinates.lat === "number" &&
        place.provenance.status === "verified";
      results.push({
        suite: "Places Provider",
        testName: "Nominatim resolves Hawa Mahal to coordinates",
        passed: valid,
        durationMs: Date.now() - start,
        details: place ? `Resolved: ${place.name} at (${place.coordinates.lat}, ${place.coordinates.lng})` : "Failed",
      });
    } catch (e: any) {
      results.push({
        suite: "Places Provider",
        testName: "Nominatim resolves Hawa Mahal to coordinates",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 4: Indian Rail Timetable & Waitlist Heuristic
  {
    const start = Date.now();
    try {
      const train = await getTrainSchedule("12056");
      const wl = estimateWaitlistConfirmation("12056", "CC", 8, 35);
      const valid =
        train !== null &&
        train.trainName.includes("Jan Shatabdi") &&
        wl.confirmationChancePercent > 50 &&
        wl.label.includes("probability");
      results.push({
        suite: "Rail Provider",
        testName: "Rail provider finds 12056 and estimates waitlist confirmation",
        passed: valid,
        durationMs: Date.now() - start,
        details: train ? `${train.trainName}, WL#8 chance: ${wl.confirmationChancePercent}% (${wl.label})` : "Not found",
      });
    } catch (e: any) {
      results.push({
        suite: "Rail Provider",
        testName: "Rail provider finds 12056 and estimates waitlist confirmation",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 5: Autonomy Ladder L3 Server-side Hard Denial (Principle P3)
  {
    const start = Date.now();
    const l3Decision = authorizeAction({
      userId: "user_test",
      tripId: "trip_test",
      actionKind: "resequence_itinerary",
      requestedAutonomyLevel: "L3",
    });
    const passed =
      l3Decision.decision === "needs_approval" &&
      l3Decision.effectiveAutonomyLevel === "L2" &&
      l3Decision.reason.includes("hard-disabled");
    results.push({
      suite: "Policy Engine",
      testName: "L3 autonomy is strictly downgraded/rejected to L2",
      passed,
      durationMs: Date.now() - start,
      details: l3Decision.reason,
    });
  }

  // TEST 6: Spend Cap Policy Enforcement
  {
    const start = Date.now();
    const overCapDecision = authorizeAction(
      {
        userId: "user_test",
        tripId: "trip_test",
        actionKind: "book_emergency_cab",
        requestedAutonomyLevel: "L1",
        estimatedCostINR: 8500, // Exceeds 5000 cap
      },
      DEFAULT_USER_POLICY
    );
    const passed =
      overCapDecision.decision === "needs_approval" &&
      overCapDecision.effectiveAutonomyLevel === "L2" &&
      overCapDecision.reason.includes("exceeds user spend cap");
    results.push({
      suite: "Policy Engine",
      testName: "Action exceeding spend cap requires explicit L2 approval",
      passed,
      durationMs: Date.now() - start,
      details: overCapDecision.reason,
    });
  }

  // TEST 7: Labeled Mock Flight Provider (Principle P2)
  {
    const start = Date.now();
    const flight = await getFlightStatus("6E-204");
    const passed = flight.provenance.isMock === true && flight.provenance.status === "estimated";
    results.push({
      suite: "Flight Provider",
      testName: "Mock flight provider attaches visible [Demo data] provenance",
      passed,
      durationMs: Date.now() - start,
      details: `Flight: ${flight.airline} ${flight.flightNumber}, Source: ${flight.provenance.source}`,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
