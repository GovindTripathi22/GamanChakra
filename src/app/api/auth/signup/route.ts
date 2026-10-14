import { cookies } from "next/headers";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { createAccount } from "@/lib/auth/accounts";
import { issueSessionForUser, sessionCookieOptions } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/token";

export const POST = handler(async (req) => {
  const body = await readJson(req);
  const { user, org } = await createAccount(body as never).catch((e: Error) => { if (/already exists/.test(e.message)) throw new HttpError(409, e.message); throw e; });
  (await cookies()).set(SESSION_COOKIE, await issueSessionForUser(user.id), sessionCookieOptions(req));
  return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan }, org: { id: org.id, name: org.name, kind: org.kind } }, 201);
}, { limit: "auth" });
