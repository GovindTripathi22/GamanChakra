import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/server";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import type { SessionPayload } from "@/lib/auth/token";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function clientKey(req: Request, session: SessionPayload | null): string {
  return session?.uid ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
}

/** Wrap a route handler with session lookup, rate limiting and uniform error responses. */
export function handler<C = unknown>(
  fn: (req: Request, ctx: { session: SessionPayload | null; params: C }) => Promise<Response>,
  opts: { auth?: "required" | "optional"; roles?: string[]; limit?: keyof typeof LIMITS } = {},
) {
  return async (req: Request, routeCtx: { params: Promise<C> }) => {
    try {
      const session = await getSession();
      if (opts.auth === "required" && !session) throw new HttpError(401, "Sign in required");
      if (opts.roles && session && !opts.roles.includes(session.role)) throw new HttpError(403, "Insufficient role");
      const rl = rateLimit(`${opts.limit ?? "api"}:${clientKey(req, session)}`, LIMITS[opts.limit ?? "api"]);
      if (!rl.ok) return json({ error: "Too many requests", retryAfterSec: rl.retryAfterSec }, { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } });
      const params = routeCtx?.params ? await routeCtx.params : ({} as C);
      return await fn(req, { session, params });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ZodError) return json({ error: "Invalid input", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
      const msg = e instanceof Error ? e.message : String(e);
      if (/no such table|does not exist in the current database|P2021|P1001|Can't reach database/i.test(msg)) {
        return json({ error: "Database not initialised or unreachable. Run `npm run setup` (or `npx prisma db push`) and restart." }, 503);
      }
      if (e instanceof SyntaxError) return json({ error: "Malformed request body" }, 400);
      console.error("[api]", e);
      return json({ error: process.env.NODE_ENV === "production" ? "Internal error" : msg }, 500);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const v = await req.json();
    return (v && typeof v === "object" ? v : {}) as T;
  } catch { return {} as T; }
}
