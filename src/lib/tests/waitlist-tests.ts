import { predictWaitlistConfirmation } from "../trains/waitlist-engine";
import { bookBackupOptionAction, monitorPnrAction } from "@/actions/waitlist-rescue";
import { TestResult } from "./contract-tests";

export async function runAllWaitlistTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // TEST 1: High Confirmation Probability on Low WL Position
  {
    const start = Date.now();
    try {
      const pred = await predictWaitlistConfirmation({
        trainNumber: "12056",
        travelClass: "CC",
        waitlistNumber: 4,
        travelDate: "2026-02-15",
      });

      const passed =
        pred.confirmationProbability >= 70 &&
        pred.confidenceLabel === "High probability" &&
        pred.isRescueNeeded === false;

      results.push({
        suite: "Waitlist Rescue",
        testName: "Predicts high probability for low waitlist numbers in Chair Car",
        passed,
        durationMs: Date.now() - start,
        details: `Probability: ${pred.confirmationProbability}%, Label: ${pred.confidenceLabel}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Waitlist Rescue",
        testName: "Predicts high probability for low waitlist numbers in Chair Car",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 2: Low Probability Trigger (<60%) Deploys >= 2 Backup Alternatives
  {
    const start = Date.now();
    try {
      const pred = await predictWaitlistConfirmation({
        trainNumber: "12051",
        travelClass: "2A",
        waitlistNumber: 28, // High waitlist in 2-tier AC
        travelDate: "2026-10-25",
      });

      const passed =
        pred.confirmationProbability < 60 &&
        pred.isRescueNeeded === true &&
        pred.alternatives.length >= 2;

      results.push({
        suite: "Waitlist Rescue",
        testName: "Deploys Plan B alternatives when confirmation odds drop below 60%",
        passed,
        durationMs: Date.now() - start,
        details: `Odds: ${pred.confirmationProbability}%, Generated ${pred.alternatives.length} alternatives`,
      });
    } catch (e: any) {
      results.push({
        suite: "Waitlist Rescue",
        testName: "Deploys Plan B alternatives when confirmation odds drop below 60%",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 3: Tatkal Window Exact Calculation (1 Day Prior at 10:00 AM IST for AC)
  {
    const start = Date.now();
    try {
      const pred = await predictWaitlistConfirmation({
        trainNumber: "12952",
        travelClass: "3A",
        waitlistNumber: 35,
        travelDate: "2026-11-20",
      });

      const tatkalAlt = pred.alternatives.find((a) => a.type === "tatkal_alert");
      const passed =
        tatkalAlt !== undefined &&
        (tatkalAlt.tatkalOpenTime || "").includes("10:00 AM IST") &&
        (tatkalAlt.tatkalOpenTime || "").includes("19") &&
        (tatkalAlt.tatkalOpenTime || "").includes("Nov");

      results.push({
        suite: "Waitlist Rescue",
        testName: "Computes exact 10:00 AM IST Tatkal opening window 1 day prior",
        passed,
        durationMs: Date.now() - start,
        details: tatkalAlt ? `Tatkal Window: ${tatkalAlt.tatkalOpenTime}` : "Not found",
      });
    } catch (e: any) {
      results.push({
        suite: "Waitlist Rescue",
        testName: "Computes exact 10:00 AM IST Tatkal opening window 1 day prior",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 4: Backup Option L2 Booking & Audit Logging
  {
    const start = Date.now();
    try {
      const pred = await predictWaitlistConfirmation({
        trainNumber: "12051",
        travelClass: "2A",
        waitlistNumber: 25,
      });
      const busBackup = pred.alternatives.find((a) => a.type === "intercity_bus");
      if (!busBackup) throw new Error("Bus backup alternative missing");

      const booking = await bookBackupOptionAction("test-trip-wl", busBackup, "traveler_test");
      const passed =
        booking.success === true &&
        booking.policyDecision.effectiveAutonomyLevel === "L2" &&
        booking.policyDecision.decision === "executed";

      results.push({
        suite: "Waitlist Rescue",
        testName: "Secures backup bus berth under L2 user approval with audit record",
        passed,
        durationMs: Date.now() - start,
        details: `Booking: ${booking.optionTitle}, Decision: ${booking.policyDecision.decision}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Waitlist Rescue",
        testName: "Secures backup bus berth under L2 user approval with audit record",
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
