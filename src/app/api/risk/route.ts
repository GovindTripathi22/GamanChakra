import { handler, json, HttpError } from "@/lib/api";
import { destinationRisk } from "@/lib/risk/engine";

export const dynamic = "force-dynamic";
/** GET /api/risk?place=Bangkok — live destination risk index with explainable drivers */
export const GET = handler(async (req) => {
  const place = new URL(req.url).searchParams.get("place");
  if (!place) throw new HttpError(400, "place is required");
  const r = await destinationRisk(place);
  if (!r.place) throw new HttpError(404, `Unknown place: ${place}`);
  return json(r);
});
