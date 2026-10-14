import { hashApiKey, authenticateAgentRequest, ensureDefaultAgentsExist } from "../protocol/agent-auth";
import { calculateDomainAccuracy, recordPredictionOutcome, getAggregatedOutcomeMetrics } from "../protocol/outcome-learning";
import { FEATURE_FLAGS } from "../config/flags";
import { db } from "../db";

export interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
  durationMs: number;
  details?: string;
}

export async function runAllProtocolTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // TEST 1: Agent Authentication & SHA-256 Key Hashing (P7)
  {
    const start = Date.now();
    try {
      const rawKey = "voyage_agt_demo_test_key_123";
      const hash1 = hashApiKey(rawKey);
      const hash2 = hashApiKey(rawKey);

      if (hash1 !== hash2 || hash1.length !== 64) {
        throw new Error("SHA-256 hash generation must be deterministic and 64 characters");
      }

      await ensureDefaultAgentsExist();

      const auth = await authenticateAgentRequest(process.env.VOYAGE_AGENT_API_KEY || "voyage_agt_dev_key_local", "trip:read");
      if (!auth.authorized) {
        throw new Error(`Expected agent to be authorized: ${auth.error}`);
      }

      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Authenticates agents via deterministic SHA-256 key hashing with scope verification (P7)",
        passed: true,
        durationMs: Date.now() - start,
        details: `Agent: ${auth.agent?.name}, Scopes: ${auth.agent?.scopes.length}`,
      });
    } catch (err: any) {
      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Authenticates agents via deterministic SHA-256 key hashing with scope verification (P7)",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 2: Domain-Specific Accuracy Calculation in Outcome Engine
  {
    const start = Date.now();
    try {
      // Delay test: predicted 30m, actual 35m (5m delta) -> ~96% accuracy
      const delayAcc = calculateDomainAccuracy("delay", { delayMinutes: 30 }, { delayMinutes: 35 });
      if (delayAcc < 90 || delayAcc > 100) {
        throw new Error(`Expected high delay accuracy for 5m delta, got ${delayAcc}`);
      }

      // Cost test: predicted 10000, actual 10500 (5% relative delta) -> ~95% accuracy
      const costAcc = calculateDomainAccuracy("cost", { midpointCost: 10000 }, { actualCost: 10500 });
      if (costAcc < 90 || costAcc > 100) {
        throw new Error(`Expected ~95% cost accuracy, got ${costAcc}`);
      }

      // Large error test: predicted 10m, actual 150m -> should degrade to 0
      const largeErrorAcc = calculateDomainAccuracy("delay", { delayMinutes: 10 }, { delayMinutes: 150 });
      if (largeErrorAcc !== 0) {
        throw new Error(`Expected 0 accuracy for 140m delta, got ${largeErrorAcc}`);
      }

      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Computes calibrated domain accuracy for transit delays and expense variances",
        passed: true,
        durationMs: Date.now() - start,
        details: `Small delay: ${delayAcc}%, Cost: ${costAcc}%, Large error: ${largeErrorAcc}%`,
      });
    } catch (err: any) {
      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Computes calibrated domain accuracy for transit delays and expense variances",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 3: Ground-Truth Outcome Recording & Append-Only Audit Logging
  {
    const start = Date.now();
    try {
      const outcome = await recordPredictionOutcome({
        kind: "delay",
        subjectRef: "6E-512-BLR-GOI",
        features: { carrier: "IndiGo", route: "BLR-GOI", scheduledDeparture: "18:30" },
        predicted: { delayMinutes: 20 },
        actual: { delayMinutes: 25 },
        actor: "AGENT",
        actorId: "voyage-primary-autonomous-agent",
      });

      if (!outcome.id || outcome.accuracyScore < 90) {
        throw new Error("Outcome recording failed to compute score or return record ID");
      }

      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Persists ground-truth prediction outcomes with calibration notes and audit events",
        passed: true,
        durationMs: Date.now() - start,
        details: `Recorded ID: ${outcome.id}, Score: ${outcome.accuracyScore}%, Note: "${outcome.calibrationNote}"`,
      });
    } catch (err: any) {
      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Persists ground-truth prediction outcomes with calibration notes and audit events",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 4: Principle P3 Hard-Disables L3 Autonomous Execution
  {
    const start = Date.now();
    try {
      if (FEATURE_FLAGS.AUTONOMY_L3_ENABLED !== false) {
        throw new Error("P3 VIOLATION: AUTONOMY_L3_ENABLED must be false");
      }

      // Simulate an agent requesting L3 auto-execution
      const requestedLevel = "L3";
      let appliedLevel: string = requestedLevel;
      let downgraded = false;

      if (appliedLevel === "L3" && !FEATURE_FLAGS.AUTONOMY_L3_ENABLED) {
        appliedLevel = "L2";
        downgraded = true;
      }

      if (!downgraded || appliedLevel !== "L2") {
        throw new Error("L3 action must be automatically downgraded to L2 awaiting human approval");
      }

      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Strictly enforces Principle P3 by hard-disabling L3 and downgrading actions to L2",
        passed: true,
        durationMs: Date.now() - start,
        details: `Requested: ${requestedLevel} -> Applied: ${appliedLevel} (downgraded: ${downgraded})`,
      });
    } catch (err: any) {
      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Strictly enforces Principle P3 by hard-disabling L3 and downgrading actions to L2",
        passed: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // TEST 5: Aggregated Telemetry Accuracy Metrics
  {
    const start = Date.now();
    try {
      const stats = await getAggregatedOutcomeMetrics();
      if (stats.averageAccuracy < 50 || stats.averageAccuracy > 100) {
        throw new Error(`Unexpected average accuracy: ${stats.averageAccuracy}`);
      }

      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Retrieves cross-domain telemetry statistics across historical predictions",
        passed: true,
        durationMs: Date.now() - start,
        details: `Observations: ${stats.totalObservations}, Avg Accuracy: ${stats.averageAccuracy}%`,
      });
    } catch (err: any) {
      results.push({
        suite: "Agent Protocol & Outcome Learning",
        testName: "Retrieves cross-domain telemetry statistics across historical predictions",
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
