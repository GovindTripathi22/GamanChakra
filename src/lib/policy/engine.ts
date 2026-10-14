import { FEATURE_FLAGS } from "../config/flags";

/**
 * Policy & Autonomy Engine (Section 5.B, Principle P3)
 * The single choke point used by EVERY execution path.
 */

export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

export interface AutonomyPolicy {
  maxAutonomyLevel: "L0" | "L1" | "L2"; // L3 strictly disallowed
  spendCapINR: number;
  quietHours: {
    enabled: boolean;
    startHourIST: number; // e.g. 23 (11 PM)
    endHourIST: number;   // e.g. 7 (7 AM)
  };
  allowedProviders?: string[];
}

export const DEFAULT_USER_POLICY: AutonomyPolicy = {
  maxAutonomyLevel: "L2",
  spendCapINR: 5000,
  quietHours: {
    enabled: true,
    startHourIST: 23,
    endHourIST: 7,
  },
  allowedProviders: ["open-meteo", "osrm-routing", "osm-nominatim", "indian-railways", "mock-flight-status"],
};

export interface ActionAuthorizationRequest {
  userId: string;
  tripId: string;
  actionKind: string; // e.g. "resequence_itinerary", "substitute_stop", "claim_shield_refund"
  requestedAutonomyLevel: AutonomyLevel;
  estimatedCostINR?: number;
  providerId?: string;
}

export interface AuthorizationDecision {
  decision: "allow" | "needs_approval" | "deny";
  reason: string;
  effectiveAutonomyLevel: "L0" | "L1" | "L2";
  timestamp: string;
}

/**
 * Centralized authorization choke point.
 * Every action execution MUST pass through here.
 */
export function authorizeAction(
  request: ActionAuthorizationRequest,
  policy: AutonomyPolicy = DEFAULT_USER_POLICY
): AuthorizationDecision {
  const now = new Date();
  const timestamp = now.toISOString();

  // RULE 1 (Principle P3): Strict L3 Prohibition
  if (request.requestedAutonomyLevel === "L3" || !FEATURE_FLAGS.AUTONOMY_L3_ENABLED) {
    if (request.requestedAutonomyLevel === "L3") {
      return {
        decision: "needs_approval",
        reason: "Autonomy level L3 (auto-act) is hard-disabled server-side by policy. Degraded to L2 (one-tap approval required).",
        effectiveAutonomyLevel: "L2",
        timestamp,
      };
    }
  }

  // RULE 2: Spend Cap Enforcement
  const cost = request.estimatedCostINR || 0;
  if (cost > policy.spendCapINR) {
    return {
      decision: "needs_approval",
      reason: `Action cost (₹${cost}) exceeds user spend cap of ₹${policy.spendCapINR}. Human approval required.`,
      effectiveAutonomyLevel: "L2",
      timestamp,
    };
  }

  // RULE 3: Quiet Hours Check (IST)
  if (policy.quietHours.enabled) {
    // Current hour in IST (UTC + 5:30)
    const istOffsetHours = 5.5;
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const istHour = (utcHours + istOffsetHours) % 24;

    const inQuietHours =
      policy.quietHours.startHourIST > policy.quietHours.endHourIST
        ? istHour >= policy.quietHours.startHourIST || istHour < policy.quietHours.endHourIST
        : istHour >= policy.quietHours.startHourIST && istHour < policy.quietHours.endHourIST;

    if (inQuietHours && request.requestedAutonomyLevel !== "L0") {
      return {
        decision: "needs_approval",
        reason: "Quiet hours active (11 PM - 7 AM IST). Action requires explicit morning confirmation.",
        effectiveAutonomyLevel: "L2",
        timestamp,
      };
    }
  }

  // RULE 4: Provider Whitelist Check
  if (
    request.providerId &&
    policy.allowedProviders &&
    policy.allowedProviders.length > 0 &&
    !policy.allowedProviders.includes(request.providerId)
  ) {
    return {
      decision: "deny",
      reason: `Provider '${request.providerId}' is not authorized under traveler policy.`,
      effectiveAutonomyLevel: "L0",
      timestamp,
    };
  }

  // Standard Allowance based on requested level
  if (request.requestedAutonomyLevel === "L2") {
    return {
      decision: "needs_approval",
      reason: "Action prepared and requires one-tap traveler confirmation (L2).",
      effectiveAutonomyLevel: "L2",
      timestamp,
    };
  }

  return {
    decision: "allow",
    reason: "Action compliant with traveler safety policy.",
    effectiveAutonomyLevel: request.requestedAutonomyLevel as "L0" | "L1",
    timestamp,
  };
}
