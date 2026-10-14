import { handler, json, HttpError } from "@/lib/api";
import { convert } from "@/lib/fx";

export const GET = handler(async (req) => {
  const u = new URL(req.url);
  const amount = Number(u.searchParams.get("amount") ?? 1);
  const from = u.searchParams.get("from") ?? "USD";
  const to = u.searchParams.get("to") ?? "INR";
  if (!Number.isFinite(amount) || amount < 0) throw new HttpError(400, "Invalid amount");
  return json(await convert(amount, from, to).catch((e: Error) => { throw new HttpError(400, e.message); }));
});
