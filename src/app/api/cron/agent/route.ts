import { json } from "@/lib/api";
import { runAgentCycle } from "@/lib/agent/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Scheduler entry point (Vercel Cron, GitHub Actions, system cron, or the bundled worker). */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (secret && authz !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);
  if (!secret && process.env.NODE_ENV === "production") return json({ error: "Set CRON_SECRET to enable the cron endpoint" }, 403);
  try {
    return json(await runAgentCycle({ trigger: "schedule" }));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 409);
  }
}
export const GET = run;
export const POST = run;
