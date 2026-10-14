/**
 * Voyage Platform Feature Flags & Autonomy Configuration
 * 
 * Principle P3 Compliance:
 * L0 inform -> L1 suggest -> L2 one-tap approve -> L3 auto-act within limits.
 * L3 is hard-disabled server-side by an immutable flag.
 */

export const FEATURE_FLAGS = {
  // Autonomy Ladder (P3)
  AUTONOMY_L3_ENABLED: false, // HARD-DISABLED SERVER-SIDE. Only L0, L1, L2 are active.
  MAX_ALLOWED_AUTONOMY_LEVEL: "L2" as const,

  // Feature Toggles
  VERIFIED_ITINERARY_ENABLED: true, // F1
  TRUE_TRIP_COST_ENABLED: true,       // F2
  TRIP_GUARDIAN_ENABLED: true,         // F3
  WAITLIST_RESCUE_ENABLED: true,       // F4
  GROUP_TRIP_ROOM_ENABLED: true,       // F5
  ROUTE_RISK_ALERTS_ENABLED: true,     // F6
  OFFLINE_EMERGENCY_CARD: true,        // F6
  FAIR_PRICE_GUIDE_ENABLED: false,     // F7 (low priority, behind flag)

  // Trust & Guardrails
  ENFORCE_PROMPT_INJECTION_DEFENSE: true, // P5: Provider data & web content treated as DATA only
  REQUIRE_VERIFICATION_PROVENANCE: true,  // P1: Every fact must have source + timestamp + status
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
