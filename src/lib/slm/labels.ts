export const INTENTS = [
  "greeting",
  "help",
  "plan_trip",
  "trip_status",
  "safety_check",
  "news_brief",
  "weather",
  "disruption_help",
  "emergency_sos",
  "currency_convert",
  "cost_estimate",
  "packing_list",
  "traveler_checkin",
  "affected_travelers",
  "run_agent",
  "set_autonomy",
  "open_page",
  "compensation_claim",
  "phrase_translate",
  "thanks_bye",
  "out_of_scope",
] as const;
export type Intent = (typeof INTENTS)[number];

export const NEWS_CATEGORIES = [
  "natural_disaster",
  "severe_weather",
  "conflict_security",
  "civil_unrest",
  "transport_disruption",
  "health_outbreak",
  "policy_advisory",
  "infrastructure_outage",
  "crowd_event",
  "price_economy",
  "travel_opportunity",
  "not_travel",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const SEVERITIES = ["low", "moderate", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CATEGORY_META: Record<NewsCategory, { label: string; color: string; defaultRadiusKm: number; weight: number; icon: string }> = {
  natural_disaster: { label: "Natural disaster", color: "#ef4444", defaultRadiusKm: 300, weight: 1.0, icon: "Mountain" },
  severe_weather: { label: "Severe weather", color: "#f59e0b", defaultRadiusKm: 200, weight: 0.8, icon: "CloudLightning" },
  conflict_security: { label: "Conflict & security", color: "#dc2626", defaultRadiusKm: 250, weight: 1.0, icon: "ShieldAlert" },
  civil_unrest: { label: "Strikes & unrest", color: "#f97316", defaultRadiusKm: 60, weight: 0.75, icon: "Megaphone" },
  transport_disruption: { label: "Transport disruption", color: "#8b5cf6", defaultRadiusKm: 80, weight: 0.9, icon: "PlaneTakeoff" },
  health_outbreak: { label: "Health outbreak", color: "#10b981", defaultRadiusKm: 300, weight: 0.7, icon: "Biohazard" },
  policy_advisory: { label: "Visa & advisories", color: "#3b82f6", defaultRadiusKm: 800, weight: 0.6, icon: "Landmark" },
  infrastructure_outage: { label: "Infrastructure outage", color: "#64748b", defaultRadiusKm: 60, weight: 0.6, icon: "ZapOff" },
  crowd_event: { label: "Crowds & events", color: "#ec4899", defaultRadiusKm: 40, weight: 0.4, icon: "Users" },
  price_economy: { label: "Prices & economy", color: "#eab308", defaultRadiusKm: 800, weight: 0.35, icon: "IndianRupee" },
  travel_opportunity: { label: "Opportunity", color: "#22c55e", defaultRadiusKm: 500, weight: 0.2, icon: "Sparkles" },
  not_travel: { label: "General", color: "#94a3b8", defaultRadiusKm: 0, weight: 0, icon: "Newspaper" },
};

export const SEVERITY_RANK: Record<Severity, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
