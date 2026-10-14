import { json } from "@/lib/api";
import { authenticateAgentRequest } from "@/lib/protocol/agent-auth";
import { destinationRisk } from "@/lib/risk/engine";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
/**
 * Partner Risk API (sell Voyage intelligence to OTAs / TMCs / insurers).
 *   GET /api/v1/risk?place=Bangkok   Authorization: Bearer voyage_agt_...
 */
export async function GET(req: Request) {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const authz = await authenticateAgentRequest(key || null, "risk:read");
  if (!authz.authorized) return json({ error: authz.error ?? "Unauthorized" }, 401);
  const rl = rateLimit(`partner:${authz.agent!.id}`, { capacity: authz.agent!.rateLimit, refillPerSec: authz.agent!.rateLimit / 60 });
  if (!rl.ok) return json({ error: "Rate limit exceeded" }, 429);
  const place = new URL(req.url).searchParams.get("place");
  if (!place) return json({ error: "place is required" }, 400);
  const r = await destinationRisk(place);
  if (!r.place) return json({ error: "Unknown place" }, 404);
  return json({ place: r.place, score: r.score, band: r.band, drivers: r.drivers.slice(0, 5).map(({ title, category, severity, distanceKm, url, publishedAt, provenance }) => ({ title, category, severity, distanceKm, url, publishedAt, provenance })), advice: r.advice, computedAt: r.computedAt });
}
