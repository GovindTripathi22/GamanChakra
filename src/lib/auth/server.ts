import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "./token";

/** Read and verify the session cookie for the current request. */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    return await verifySession(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Drop-in replacement for the old Clerk `auth()` helper. */
export async function auth(): Promise<{ userId: string | null; orgId: string | null; role: string | null }> {
  const s = await getSession();
  return { userId: s?.uid ?? null, orgId: s?.oid ?? null, role: s?.role ?? null };
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
  plan: string;
  publicMetadata: { isPro: boolean; proExpires?: number; plan: string };
}

/** Drop-in replacement for the old Clerk `currentUser()` helper. */
export async function currentUser(): Promise<CurrentUser | null> {
  const s = await getSession();
  if (!s) return null;
  const isPro = s.plan !== "free";
  return {
    id: s.uid, email: s.email, name: s.name, orgId: s.oid, role: s.role, plan: s.plan,
    publicMetadata: { isPro, proExpires: isPro ? Date.now() + 365 * 864e5 : undefined, plan: s.plan },
  };
}

export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (process.env.ADMIN_USER_ID || "").split(",").map((x) => x.trim()).filter(Boolean).includes(userId);
}

export async function issueSessionForUser(userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) throw new Error("User not found");
  return signSession({
    uid: u.id, oid: u.orgId, role: u.role as SessionPayload["role"], plan: u.plan, name: u.name, email: u.email, sv: u.sessionVersion,
  });
}

/** Secure flag follows the actual request scheme, so plain-HTTP LAN/self-hosted installs still work. */
export function sessionCookieOptions(req?: Request) {
  const proto = req?.headers.get("x-forwarded-proto") ?? (req ? new URL(req.url).protocol.replace(":", "") : "https");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: proto === "https" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
