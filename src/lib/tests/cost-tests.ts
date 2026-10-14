import { GeneratedTrip } from "@/types/trip";
import { calculateTripCost } from "../cost/engine";
import { TestResult } from "./contract-tests";

export async function runAllCostTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  const sampleTrip: GeneratedTrip = {
    trip_details: {
      destination: "Jaipur",
      duration: "4 days",
      budget: "standard",
      vibe: "cultural",
      total_estimated_cost: "₹35,000",
    },
    transportation_plan: [
      {
        mode: "Train",
        details: "Vande Bharat Express (NDLS -> JP)",
        estimated_cost: "₹1,800",
        duration: "3h 45m",
      },
    ],
    hotels: [
      {
        name: "Heritage Haveli Jaipur",
        address: "Old City, Jaipur",
        price: "₹3,500/night",
        image_query: "jaipur haveli",
        rating: 4.8,
      },
    ],
    itinerary: [
      {
        day: 1,
        theme: "Forts and Palaces",
        activities: [
          {
            id: "act-1",
            timeSlot: "09:00 AM - 12:00 PM",
            startTime: "09:00",
            endTime: "12:00",
            title: "Amber Fort",
            description: "Fort visit",
            category: "sightseeing",
            locationName: "Amber",
            coordinates: { lat: 26.9855, lng: 75.8513 },
            ticket_price: "₹500",
            estimatedCost: { amount: 500, currency: "₹" },
          },
        ],
      },
    ],
  };

  // TEST 1: Full 7-Category Line Item Generation
  {
    const start = Date.now();
    try {
      const breakdown = calculateTripCost(sampleTrip);
      const categories = new Set(breakdown.lines.map((l) => l.category));
      const hasAll7 =
        categories.has("stay") &&
        categories.has("transport") &&
        categories.has("food") &&
        categories.has("activities") &&
        categories.has("local_transit") &&
        categories.has("taxes_fees") &&
        categories.has("unexpected_buffer");

      const validTotals =
        breakdown.totalMin > 10000 &&
        breakdown.totalMax > breakdown.totalMin &&
        breakdown.expectedTotal > breakdown.totalMin;

      const passed = hasAll7 && validTotals;
      results.push({
        suite: "Cost Engine",
        testName: "Generates all 7 transparent cost categories including GST & Buffer",
        passed,
        durationMs: Date.now() - start,
        details: `Total Range: ₹${breakdown.totalMin} - ₹${breakdown.totalMax}, Expected: ₹${breakdown.expectedTotal}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Cost Engine",
        testName: "Generates all 7 transparent cost categories including GST & Buffer",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 2: Budget Cap Overrun & Culprit Identification
  {
    const start = Date.now();
    try {
      // User sets an unrealistically tight budget cap of ₹12,000 for standard 4-day trip
      const overBudgetBreakdown = calculateTripCost(sampleTrip, 12000);
      const passed =
        overBudgetBreakdown.budgetStatus === "exceeds_budget" &&
        (overBudgetBreakdown.overageAmount || 0) > 10000 &&
        overBudgetBreakdown.overageCulprits.length >= 1 &&
        overBudgetBreakdown.overageCulprits.some((c) => c.isCulpritOverBudget);

      results.push({
        suite: "Cost Engine",
        testName: "Flags budget overrun and pinpoints specific culprit items",
        passed,
        durationMs: Date.now() - start,
        details: `Status: ${overBudgetBreakdown.budgetStatus}, Overage: ₹${overBudgetBreakdown.overageAmount}, Culprits: ${overBudgetBreakdown.overageCulprits.map((c) => c.title).join(", ")}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Cost Engine",
        testName: "Flags budget overrun and pinpoints specific culprit items",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 3: Sourced Accommodation Pricing (Confirmed Status)
  {
    const start = Date.now();
    try {
      const breakdown = calculateTripCost(sampleTrip);
      const stayLine = breakdown.lines.find((l) => l.category === "stay");
      const passed =
        stayLine !== undefined &&
        stayLine.status === "confirmed" &&
        stayLine.source.includes("accommodations");

      results.push({
        suite: "Cost Engine",
        testName: "Marks stays as confirmed when sourced from real accommodations",
        passed,
        durationMs: Date.now() - start,
        details: stayLine ? `Status: ${stayLine.status}, Source: ${stayLine.source}` : "Not found",
      });
    } catch (e: any) {
      results.push({
        suite: "Cost Engine",
        testName: "Marks stays as confirmed when sourced from real accommodations",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 4: Group Scaling Multipliers
  {
    const start = Date.now();
    try {
      const soloTrip: GeneratedTrip = {
        ...sampleTrip,
        trip_details: { ...sampleTrip.trip_details, budget: "solo standard" },
      };
      const familyTrip: GeneratedTrip = {
        ...sampleTrip,
        trip_details: { ...sampleTrip.trip_details, budget: "family 4 people standard" },
      };

      const soloBreakdown = calculateTripCost(soloTrip);
      const familyBreakdown = calculateTripCost(familyTrip);

      const passed =
        familyBreakdown.expectedTotal > soloBreakdown.expectedTotal * 1.8 &&
        familyBreakdown.travelersCount === 4 &&
        soloBreakdown.travelersCount === 1;

      results.push({
        suite: "Cost Engine",
        testName: "Accurately scales food and stays for solo vs family travelers",
        passed,
        durationMs: Date.now() - start,
        details: `Solo Total: ₹${soloBreakdown.expectedTotal}, Family Total: ₹${familyBreakdown.expectedTotal}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Cost Engine",
        testName: "Accurately scales food and stays for solo vs family travelers",
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
