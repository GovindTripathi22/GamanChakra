import { handler, json } from "@/lib/api";
import { riskLeaderboard } from "@/lib/risk/engine";

export const dynamic = "force-dynamic";
export const GET = handler(async (req) => json({ cities: await riskLeaderboard(Math.min(50, Number(new URL(req.url).searchParams.get("limit") ?? 15))) }));
