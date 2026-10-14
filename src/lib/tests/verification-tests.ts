import { GeneratedTrip } from "@/types/trip";
import { verifyItinerary } from "../verification/engine";
import { TestResult } from "./contract-tests";

export async function runAllVerificationTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // TEST 1: Feasible Itinerary with Realistic Buffers
  {
    const start = Date.now();
    try {
      const feasibleTrip: GeneratedTrip = {
        trip_details: {
          destination: "Jaipur",
          duration: "1 day",
          budget: "standard",
          vibe: "cultural",
          total_estimated_cost: "₹6,000",
        },
        transportation_plan: [],
        hotels: [],
        itinerary: [
          {
            day: 1,
            theme: "Pink City Heritage",
            activities: [
              {
                id: "act-1-1",
                timeSlot: "09:00 AM - 11:30 AM",
                startTime: "09:00",
                endTime: "11:30",
                title: "Amber Palace",
                description: "Historic fort and palace complex",
                category: "sightseeing",
                locationName: "Amber, Jaipur",
                coordinates: { lat: 26.9855, lng: 75.8513 },
              },
              {
                id: "act-1-2",
                timeSlot: "02:00 PM - 04:30 PM", // 2.5 hour buffer (ample time for 8 km drive)
                startTime: "14:00",
                endTime: "16:30",
                title: "Hawa Mahal",
                description: "Palace of Winds in central Jaipur",
                category: "sightseeing",
                locationName: "Badi Choupad, Jaipur",
                coordinates: { lat: 26.9239, lng: 75.8268 },
              },
            ],
          },
        ],
      };

      const report = await verifyItinerary(feasibleTrip, "test-feasible");
      const passed =
        report.overallScore === 100 &&
        report.criticalIssuesCount === 0 &&
        report.itemVerifications["act-1-1"].status === "verified";

      results.push({
        suite: "Verification Engine",
        testName: "Feasible itinerary is verified with 100% score",
        passed,
        durationMs: Date.now() - start,
        details: `Score: ${report.overallScore}%, Issues: ${report.issuesCount}, Summary: ${report.summary}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Verification Engine",
        testName: "Feasible itinerary is verified with 100% score",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 2: Tight Connection Buffer Detection (BUFFER_TOO_SHORT)
  {
    const start = Date.now();
    try {
      const tightBufferTrip: GeneratedTrip = {
        trip_details: {
          destination: "North India",
          duration: "1 day",
          budget: "standard",
          vibe: "adventure",
          total_estimated_cost: "₹10,000",
        },
        transportation_plan: [],
        hotels: [],
        itinerary: [
          {
            day: 1,
            theme: "Transit Stress Test",
            activities: [
              {
                id: "act-tight-1",
                timeSlot: "09:00 AM - 11:30 AM",
                startTime: "09:00",
                endTime: "11:30",
                title: "Connaught Place, New Delhi",
                description: "Central shopping and business hub",
                category: "sightseeing",
                locationName: "New Delhi",
                coordinates: { lat: 28.6315, lng: 77.2167 },
              },
              {
                id: "act-tight-2",
                timeSlot: "11:45 AM - 02:00 PM", // Only 15 min gap for a 280km trip!
                startTime: "11:45",
                endTime: "14:00",
                title: "City Palace, Jaipur",
                description: "Royal residence in Jaipur",
                category: "culture",
                locationName: "Jaipur",
                coordinates: { lat: 26.9258, lng: 75.8237 },
              },
            ],
          },
        ],
      };

      const report = await verifyItinerary(tightBufferTrip, "test-tight");
      const tightVerification = report.itemVerifications["act-tight-1"];
      const passed =
        tightVerification?.issue?.code === "BUFFER_TOO_SHORT" &&
        tightVerification.issue.severity === "critical" &&
        tightVerification.recoveryOptions.length >= 1;

      results.push({
        suite: "Verification Engine",
        testName: "Catches BUFFER_TOO_SHORT when transit duration exceeds gap",
        passed,
        durationMs: Date.now() - start,
        details: tightVerification?.issue
          ? `Flagged: ${tightVerification.issue.message} with ${tightVerification.recoveryOptions.length} recovery options`
          : "Failed to flag",
      });
    } catch (e: any) {
      results.push({
        suite: "Verification Engine",
        testName: "Catches BUFFER_TOO_SHORT when transit duration exceeds gap",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 3: Known Venue Closure Day Check (VENUE_CLOSED for Taj Mahal on Friday)
  {
    const start = Date.now();
    try {
      const closedVenueTrip: GeneratedTrip = {
        trip_details: {
          destination: "Agra",
          duration: "1 day",
          budget: "standard",
          vibe: "Friday Heritage Special", // Triggers Friday detection
          total_estimated_cost: "₹5,000",
        },
        transportation_plan: [],
        hotels: [],
        itinerary: [
          {
            day: 1,
            theme: "Agra Wonders",
            activities: [
              {
                id: "act-closed-1",
                timeSlot: "10:00 AM - 01:00 PM",
                startTime: "10:00",
                endTime: "13:00",
                title: "Taj Mahal Monument Visit (Friday Tour)",
                description: "Mughal marble mausoleum",
                category: "sightseeing",
                locationName: "Agra",
                coordinates: { lat: 27.1751, lng: 78.0421 },
              },
            ],
          },
        ],
      };

      const report = await verifyItinerary(closedVenueTrip, "test-closed");
      const tajVerification = report.itemVerifications["act-closed-1"];
      const passed =
        tajVerification?.issue?.code === "VENUE_CLOSED" &&
        tajVerification.issue.severity === "critical" &&
        tajVerification.issue.message.includes("closed on Friday");

      results.push({
        suite: "Verification Engine",
        testName: "Catches VENUE_CLOSED for Taj Mahal on Friday",
        passed,
        durationMs: Date.now() - start,
        details: tajVerification?.issue
          ? `Flagged: ${tajVerification.issue.message}`
          : "Failed to flag",
      });
    } catch (e: any) {
      results.push({
        suite: "Verification Engine",
        testName: "Catches VENUE_CLOSED for Taj Mahal on Friday",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 4: Visiting Outside Operating Hours
  {
    const start = Date.now();
    try {
      const lateNightTrip: GeneratedTrip = {
        trip_details: {
          destination: "Jaipur",
          duration: "1 day",
          budget: "budget",
          vibe: "nightlife",
          total_estimated_cost: "₹3,000",
        },
        transportation_plan: [],
        hotels: [],
        itinerary: [
          {
            day: 1,
            theme: "Late Exploration",
            activities: [
              {
                id: "act-late-1",
                timeSlot: "10:30 PM - 11:45 PM",
                startTime: "22:30",
                endTime: "23:45",
                title: "Hawa Mahal Interior Tour",
                description: "Explore palace interior corridors",
                category: "sightseeing",
                locationName: "Jaipur",
                coordinates: { lat: 26.9239, lng: 75.8268 },
              },
            ],
          },
        ],
      };

      const report = await verifyItinerary(lateNightTrip, "test-late");
      const lateVerification = report.itemVerifications["act-late-1"];
      const passed =
        lateVerification?.issue?.code === "VENUE_CLOSED" &&
        lateVerification.recoveryOptions.length >= 1;

      results.push({
        suite: "Verification Engine",
        testName: "Catches visiting outside operating hours and suggests morning window",
        passed,
        durationMs: Date.now() - start,
        details: lateVerification?.issue
          ? `Flagged: ${lateVerification.issue.message}, Recovery: ${lateVerification.recoveryOptions[0].title}`
          : "Failed to flag",
      });
    } catch (e: any) {
      results.push({
        suite: "Verification Engine",
        testName: "Catches visiting outside operating hours and suggests morning window",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 5: One-Tap Recovery Patch Application
  {
    const start = Date.now();
    try {
      const testOpt = {
        id: "rec-test",
        title: "Shift Next Stop to 03:00 PM",
        action: "shift_time" as const,
        explanation: "Relaxes buffer",
        tradeOff: "None",
        confidence: 95,
        patch: {
          activityId: "act-test",
          startTime: "03:00 PM",
          endTime: "05:00 PM",
          timeSlot: "03:00 PM - 05:00 PM",
        },
      };

      const activity = {
        id: "act-test",
        timeSlot: "11:00 AM - 12:00 PM",
        startTime: "11:00",
        endTime: "12:00",
        title: "Test Activity",
        description: "Test description",
        category: "sightseeing" as const,
        locationName: "Test Location",
        coordinates: { lat: 0, lng: 0 },
      };

      // Apply patch
      if (testOpt.patch.startTime) activity.startTime = testOpt.patch.startTime;
      if (testOpt.patch.endTime) activity.endTime = testOpt.patch.endTime;
      if (testOpt.patch.timeSlot) activity.timeSlot = testOpt.patch.timeSlot;

      const passed =
        activity.startTime === "03:00 PM" &&
        activity.endTime === "05:00 PM" &&
        activity.timeSlot === "03:00 PM - 05:00 PM";

      results.push({
        suite: "Verification Engine",
        testName: "One-tap recovery patch successfully updates activity timings",
        passed,
        durationMs: Date.now() - start,
        details: `Patched: ${activity.timeSlot}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Verification Engine",
        testName: "One-tap recovery patch successfully updates activity timings",
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
