import { cookies } from "next/headers";
import { handler, json } from "@/lib/api";
import { ensureDemoWorkspace } from "@/lib/demo/seed";
import { issueSessionForUser, sessionCookieOptions } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/token";
import { db } from "@/lib/db";
import { runAgentCycle } from "@/lib/agent/runner";

/** One-click live demo: provisions the "Demo Travel Co." workspace and signs you in. */
export const POST = handler(async (req) => {
  if (process.env.DISABLE_DEMO === "true") return json({ error: "Demo disabled" }, 404);
  const { user, org, created } = await ensureDemoWorkspace();
  if (created) {
    // Populate the brand-new workspace immediately so the demo is alive on first load.
    const recent = await db.newsEvent.count({ where: { publishedAt: { gt: new Date(Date.now() - 24 * 36e5) } } });
    await runAgentCycle({ trigger: "automation", orgId: org.id, ingest: recent === 0 }).catch((e) => console.warn("[demo] initial cycle failed", e));
  }
  (await cookies()).set(SESSION_COOKIE, await issueSessionForUser(user.id), sessionCookieOptions(req));
  return json({ ok: true, user: { id: user.id, name: user.name } });
}, { limit: "demo" });
