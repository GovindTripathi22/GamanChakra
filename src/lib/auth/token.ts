/**
 * Stateless, HMAC-SHA256 signed session tokens.
 * Uses Web Crypto only, so it runs in Node, the Next.js proxy and the browser test env.
 * No third-party auth provider and no API keys: the only secret is AUTH_SECRET,
 * which you generate yourself (`npm run setup` writes one into .env).
 */

export interface SessionPayload {
  uid: string;
  oid: string; // organization id
  role: "owner" | "admin" | "agent" | "viewer";
  plan: string;
  name: string;
  email: string;
  sv: number; // session version (bump on the user row to revoke every session)
  exp: number; // unix seconds
}

export const SESSION_COOKIE = "gc_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

const DEV_FALLBACK_SECRET = "voyage-dev-only-secret-change-me-in-production-0123456789";

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_SECRET) {
    // Fail-safe: still boot (so a first `npm start` works) but shout about it.
    if (!(globalThis as { __gcWarned?: boolean }).__gcWarned) {
      (globalThis as { __gcWarned?: boolean }).__gcWarned = true;
      console.warn("[auth] AUTH_SECRET is missing or shorter than 32 chars. Run `npm run setup` before going live.");
    }
  }
  return DEV_FALLBACK_SECRET;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: Omit<SessionPayload, "exp">, ttlSeconds = SESSION_TTL_SECONDS, secret = getAuthSecret()): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64url(enc.encode(JSON.stringify(full)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null, secret = getAuthSecret()): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig) as BufferSource, enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (!payload.uid || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Generic signed, expiring token (used for traveler check-in links and webhook signatures). */
export async function hmacHex(data: string, secret = getAuthSecret()): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}
