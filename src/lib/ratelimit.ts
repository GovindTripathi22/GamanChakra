/**
 * In-process token-bucket rate limiter (replaces the Arcjet SaaS dependency — no API key).
 * For multi-instance deployments put a reverse proxy limit in front as well.
 */
interface Bucket { tokens: number; updated: number }
const g = globalThis as unknown as { __gcBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = g.__gcBuckets ?? (g.__gcBuckets = new Map());

export function rateLimit(key: string, opts: { capacity: number; refillPerSec: number }): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, updated: now };
  const elapsed = (now - b.updated) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsed * opts.refillPerSec);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((1 - b.tokens) / opts.refillPerSec) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 50_000) for (const [k, v] of buckets) if (now - v.updated > 36e5) buckets.delete(k);
  return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0 };
}

export const LIMITS = {
  api: { capacity: 120, refillPerSec: 2 },
  auth: { capacity: 20, refillPerSec: 0.2 },
  demo: { capacity: 60, refillPerSec: 1 },
  jarvis: { capacity: 40, refillPerSec: 0.5 },
  agentRun: { capacity: 6, refillPerSec: 0.05 },
  tripFree: { capacity: 5, refillPerSec: 5 / 86400 },
};
