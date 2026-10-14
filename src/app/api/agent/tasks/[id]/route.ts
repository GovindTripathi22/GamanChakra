import { safeJson } from "@/lib/events/bus";
import { z } from "zod";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { decideTask } from "@/lib/agent/executor";

const Body = z.object({ decision: z.enum(["approve", "reject"]) });
/** POST /api/agent/tasks/:id {decision} — human-in-the-loop approval (P3). */
export const POST = handler<{ id: string }>(async (req, { session, params }) => {
  const b = Body.parse(await readJson(req));
  const t = await decideTask(params.id, b.decision, session!.uid, session!.oid).catch((e: Error) => { throw new HttpError(/not found/i.test(e.message) ? 404 : /forbidden/i.test(e.message) ? 403 : 409, e.message); });
  return json({ task: { ...t, payload: safeJson(t.payload, {}), result: safeJson(t.result, null) } });
}, { auth: "required", roles: ["owner", "admin", "agent"] });
