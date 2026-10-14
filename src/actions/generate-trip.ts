"use server";

import { headers } from "next/headers";
import { auth, currentUser, isAdminUser } from "@/lib/auth/server";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { planTripLocally } from "@/lib/planner/local-planner";
import { generateJSON, CHAKRA_SYSTEM_PROMPT } from "@/lib/slm/generative";
import type { TripData, GeneratedTrip } from "@/types/trip";

/**
 * Generate an itinerary with the keyless Voyage planner (offline KB + geo engine).
 * If the local generative SLM (Ollama) is running, day themes are polished by it; facts never come from it.
 */
export async function generateTrip(tripData: TripData): Promise<GeneratedTrip | { error: string }> {
  try {
    if (!tripData.destination || !tripData.days) return { error: "Please choose a destination and number of days." };
    const { userId } = await auth();
    const user = await currentUser();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const isPaid = user?.publicMetadata.isPro || isAdminUser(userId);
    if (!isPaid) {
      const rl = rateLimit(`trip:${userId ?? ip}`, LIMITS.tripFree);
      if (!rl.ok) return { error: "Free plan limit reached (5 itineraries per day). Upgrade to Pro for unlimited planning." };
    }
    const trip = planTripLocally(tripData);

    const themes = await generateJSON<{ themes: string[] }>([
      { role: "system", content: CHAKRA_SYSTEM_PROMPT },
      { role: "user", content: `Give a short evocative theme (max 6 words) for each day. Reply JSON {"themes": [...]}.\n${trip.itinerary.map((d) => `Day ${d.day}: ${d.activities.map((a) => a.title).join(", ")}`).join("\n")}` },
    ], { maxTokens: 160, timeoutMs: 6000 });
    if (themes?.themes?.length === trip.itinerary.length) trip.itinerary.forEach((d, i) => (d.theme = String(themes.themes[i]).slice(0, 60)));
    return trip;
  } catch (error) {
    console.error("Error generating trip:", error);
    return { error: `Could not generate the trip: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}
