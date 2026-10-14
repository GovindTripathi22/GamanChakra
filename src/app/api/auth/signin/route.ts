import { cookies } from "next/headers";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { authenticate } from "@/lib/auth/accounts";
import { issueSessionForUser, sessionCookieOptions } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/token";

export const POST = handler(async (req) => {
  const user = await authenticate((await readJson(req)) as never).catch((e: Error) => { if (e.name === "ZodError") throw e; throw new HttpError(401, e.message); });
  (await cookies()).set(SESSION_COOKIE, await issueSessionForUser(user.id), sessionCookieOptions(req));
  return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } });
}, { limit: "auth" });
