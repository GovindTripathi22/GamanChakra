import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { estimateCompensation } from "@/lib/claims/calculator";
import { findPlace, haversineKm } from "@/lib/geo/gazetteer";

const Body = z.object({
  kind: z.enum(["delay", "cancellation", "denied_boarding"]),
  from: z.string().min(2), to: z.string().min(2), carrierCountry: z.string().length(2).optional(),
  delayHours: z.number().min(0).max(96).optional(), noticeDays: z.number().min(0).max(365).optional(),
  basicFareInr: z.number().min(0).optional(), alternateWithinHours: z.number().min(0).max(96).optional(), extraordinary: z.boolean().optional(),
});
/** POST /api/claims — DGCA / EU261 / UK261 / US DOT entitlement estimate + ready-to-send claim letter. */
export const POST = handler(async (req) => {
  const b = Body.parse(await readJson(req));
  const a = findPlace(b.from), c = findPlace(b.to);
  if (!a || !c) return json({ error: "Unknown city or airport" }, 400);
  const result = estimateCompensation({ kind: b.kind, departureCountry: a.countryCode, arrivalCountry: c.countryCode, carrierCountry: b.carrierCountry, distanceKm: haversineKm(a, c), delayHoursAtArrival: b.delayHours, noticeDays: b.noticeDays, basicFareInr: b.basicFareInr, alternateWithinHours: b.alternateWithinHours, extraordinary: b.extraordinary });
  return json({ from: a.name, to: c.name, distanceKm: haversineKm(a, c), ...result, disclaimer: "Informational estimate, not legal advice." });
});
