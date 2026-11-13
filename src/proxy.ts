import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/** Route protection (replaces Clerk middleware). Verifies the signed session cookie. */
const PROTECTED = [/^\/command/, /^\/duty-of-care/, /^\/automations/, /^\/agent/, /^\/my-trips/, /^\/settings/, /^\/control-tower/, /^\/execution/, /^\/exchange/, /^\/profile/, /^\/world-model/, /^\/destination-intelligence/];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((r) => r.test(pathname))) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
