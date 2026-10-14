import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { runAgentCycle } from "@/lib/agent/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const Body = z.object({ newsMode: z.enum(["auto", "live", "drill"]).optional(), ingest: z.boolean().optional() });

/** POST /api/agent/run — run one autonomous SENSE→THINK→PLAN→ACT→REFLECT cycle for your organisation. */
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  return json(await runAgentCycle({ trigger: "manual", orgId: session!.oid, newsMode: b.newsMode, ingest: b.ingest }));
}, { auth: "required", limit: "agentRun" });
