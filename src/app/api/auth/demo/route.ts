import { cookies } from "next/headers";
import { handler, json } from "@/lib/api";
import { ensureDemoWorkspace } from "@/lib/demo/seed";
import { issueSessionForUser, sessionCookieOptions } from "@/lib/auth/server";
import { SESSION_COOKIE, signSession } from "@/lib/auth/token";
import { db, isDbAvailable } from "@/lib/db";
import { runAgentCycle } from "@/lib/agent/runner";

/** One-click live demo: provisions the "Demo Travel Co." workspace and signs you in. */
export const POST = handler(async (req) => {
  if (process.env.DISABLE_DEMO === "true") return json({ error: "Demo disabled" }, 404);

  try {
    if (await isDbAvailable()) {
      const { user, org, created } = await ensureDemoWorkspace();
      if (created) {
        // Populate the brand-new workspace immediately so the demo is alive on first load.
        const recent = await db.newsEvent.count({ where: { publishedAt: { gt: new Date(Date.now() - 24 * 36e5) } } }).catch(() => 0);
        await runAgentCycle({ trigger: "automation", orgId: org.id, ingest: recent === 0 }).catch((e) => console.warn("[demo] initial cycle failed", e));
      }
      (await cookies()).set(SESSION_COOKIE, await issueSessionForUser(user.id), sessionCookieOptions(req));
      return json({ ok: true, user: { id: user.id, name: user.name } });
    }
  } catch (err) {
    console.warn("[demo] database unavailable, issuing fallback in-memory demo session", err);
  }
  // Graceful fallback session when PostgreSQL is not running locally
  const fallbackToken = await signSession({
    uid: "demo-ops-user",
    oid: "demo-travel-co",
    role: "owner",
    plan: "business",
    name: "Demo Ops Manager",
    email: "ops@demo-travel.co",
    sv: 1,
  });
  (await cookies()).set(SESSION_COOKIE, fallbackToken, sessionCookieOptions(req));
  return json({ ok: true, user: { id: "demo-ops-user", name: "Demo Ops Manager" } });
}, { limit: "demo" });
