export interface Activity {
  id: string;
  timeSlot: string;
  startTime: string; // "09:00" (24h)
  endTime: string;   // "11:00" (24h)
  title: string;
  description: string;
  category: "sightseeing" | "food" | "culture" | "leisure" | "buffer";
  locationName: string;
  coordinates: { lat: number; lng: number };
  crowdLevel?: "low" | "moderate" | "peak";
  offPeakTip?: string;
  bookingDeadline?: "walk-in" | "3-7 days advance" | "30+ days required";
  estimatedCost?: { amount: number; currency: string };
  isGapFiller?: boolean;

  // Live Object State Machine & Execution Fields
  status?: "scheduled" | "in_progress" | "delayed" | "disrupted" | "rebooked" | "completed" | "cancelled";
  dependsOnStepId?: string;
  dependencyTitle?: string;
  prediction?: LiveStepPrediction;
  actualOutcome?: LiveStepOutcome;
  isProtectedByShield?: boolean;
  shieldPayoutAmount?: number;
  
  // Legacy & Compatibility fields
  place_name?: string;
  details?: string;
  time?: string;
  ticket_price?: string;
  image_query?: string;
  image_url?: string;
  geo_coordinates?: { lat: number; lng: number };
  logistics?: string;
}

export interface DayPlan {
  day: number;
  theme: string;
  date?: string;
  pacingRating?: "light" | "balanced" | "intense";
  activities: Activity[];
}

export type DayItinerary = DayPlan;

export interface ScheduleGap {
  dayIndex: number;
  insertAtIndex: number;
  startTime: string; // "11:00"
  endTime: string;   // "13:30"
  durationMinutes: number;
  anchorCoordinates: { lat: number; lng: number };
  anchorLocationName?: string;
}

export interface GapDealOption {
  id: string;
  title: string;
  description: string;
  category: "sightseeing" | "food" | "culture" | "leisure";
  durationMinutes: number;
  discountPercent: number; // e.g. 25 -> "Save 25% Off-Peak"
  walkTimeMinutes: number;
  price: { amount: number; currency: string };
  crowdLevel: "low" | "moderate";
  offPeakTip: string;
  bookingDeadline: "walk-in";
  coordinates?: { lat: number; lng: number };
  locationName: string;
  image_url?: string;
}

export interface Hotel {
  name: string;
  address: string;
  price: string;
  image_query: string;
  image_url?: string;
  geo_coordinates?: {
    lat: number;
    lng: number;
  };
  rating: number;
  description?: string;
  amenities?: string[];
  tier?: "budget" | "comfort" | "luxury";
}

export interface TransportationStep {
  mode: "Flight" | "Train" | "Bus" | "Taxi" | "Local";
  details: string;
  estimated_cost: string;
  duration: string;
  distance?: string;
}

export interface TripData {
  origin: string;
  destination: string;
  days: string;
  budget: string;
  travelers: string;
  vibe: string;
  startDate?: string;
  travelMode?: string;
  includeTravelDays?: boolean | "yes" | "no" | "included" | "excluded";
}

export interface GeneratedTrip {
  trip_details: {
    destination: string;
    duration: string;
    budget: string;
    vibe: string;
    total_estimated_cost: string;
    travelers?: string;
    startDate?: string;
    endDate?: string;
    includeTravelDays?: boolean | "yes" | "no";
  };
  transportation_plan: TransportationStep[];
  hotels: Hotel[];
  itinerary: DayItinerary[];
}

export interface DisruptionEvent {
  id: string;
  type: "delay" | "weather" | "closure" | "crowd_spike";
  title: string;
  description: string;
  severity: "minor" | "moderate" | "critical";
  delayMinutes?: number;
  affectedActivityId?: string;
  dayIndex: number;
  recommendedActionSnippet?: string;
}

export interface RecoveryOption {
  id: string;
  title: string;
  strategy: "reorder" | "substitute" | "buffer_relax";
  badgeText: string;
  confidenceScore: number; // 0 - 100
  explanation: string;
  tradeOffSummary: string;
  costDelta: { amount: number; currency: string };
  updatedActivities: Activity[];
}

export interface DisruptionAnalysisResult {
  disruption: DisruptionEvent;
  impactSummary: string;
  cascadingFailures: string[];
  options: RecoveryOption[];
}

export interface ControlTowerStatus {
  healthScore: number; // 0 - 100
  status: "optimal" | "monitoring" | "disrupted";
  guardianMode: "copilot" | "autonomous";
  lastCheckTimestamp: string;
  activeDisruption?: DisruptionEvent | null;
}

export interface LiveStepPrediction {
  delayRiskScore: number; // 0 - 100
  predictedCrowdLevel: "low" | "moderate" | "peak";
  weatherSensitivity: "outdoor_high" | "outdoor_sheltered" | "indoor";
  estimatedTransitMinutes: number;
}

export interface LiveStepOutcome {
  actualDelayMinutes: number;
  actualCrowdLevel: "low" | "moderate" | "peak";
  reportedAt: string;
  notes?: string;
  reporterStatus?: "on_time" | "delayed" | "crowded" | "weather_compromised";
}

export interface OutcomeRecord {
  tripId: string;
  stepId: string;
  stepTitle: string;
  category: string;
  prediction: LiveStepPrediction;
  outcome: LiveStepOutcome;
  deltaMinutes: number;
  accuracyScore: number;
}

export interface GlobalTelemetryStats {
  totalTrackedSteps: number;
  predictionAccuracy: number; // percentage, e.g. 91.4
  averageDelayMinutes: number;
  shieldClaimsPaid: number;
  totalShieldPayoutAmount: number;
}

export interface TripShieldClaim {
  id: string;
  tripId: string;
  stepId: string;
  stepTitle: string;
  claimReason: string;
  payoutAmount: number;
  currency: string;
  upiId: string;
  utrNumber: string;
  timestamp: string;
  status: "instant_settled" | "processing";
}

// Runtime marker to ensure the module is never considered empty
export const TRIP_SCHEMA_VERSION = "2.0";


