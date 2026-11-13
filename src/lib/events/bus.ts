import { EventEmitter } from "node:events";
import { db } from "@/lib/db";

/**
 * Real-time event bus.
 *  - In-process EventEmitter for instant fan-out to SSE clients on this instance.
 *  - Every event is also persisted to `SystemEvent`, and SSE handlers poll it by cursor,
 *    so multiple app instances / the background worker stay in sync without Redis.
 */
export type BusEventType =
  | "news.ingested"
  | "news.event"
  | "agent.run"
  | "agent.step"
  | "agent.task"
  | "risk.alert"
  | "checkin.update"
  | "notification";

export interface BusEvent { id: string; type: BusEventType; orgId: string | null; payload: unknown; createdAt: string }

const g = globalThis as unknown as { __gcBus?: EventEmitter };
export const bus: EventEmitter = g.__gcBus ?? (g.__gcBus = new EventEmitter().setMaxListeners(1000));

export async function publish(type: BusEventType, payload: unknown, orgId: string | null = null): Promise<BusEvent> {
  let id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let createdAt = new Date().toISOString();
  try {
    const row = await db.systemEvent.create({ data: { type, orgId, payload: JSON.stringify(payload ?? {}) } });
    id = row.id;
    createdAt = row.createdAt.toISOString();
  } catch {
    /* persistence is best-effort; in-memory delivery still happens */
  }
  const evt: BusEvent = { id, type, orgId, payload, createdAt };
  bus.emit("event", evt);
  return evt;
}

export async function eventsSince(since: Date, orgId: string | null, limit = 100): Promise<BusEvent[]> {
  const rows = await db.systemEvent.findMany({
    where: { createdAt: { gt: since }, OR: [{ orgId: null }, ...(orgId ? [{ orgId }] : [])] },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows.map((r) => ({ id: r.id, type: r.type as BusEventType, orgId: r.orgId, payload: safeJson(r.payload), createdAt: r.createdAt.toISOString() }));
}

export function safeJson<T = unknown>(s: string | null | undefined, fallback: T = {} as T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function pruneSystemEvents(olderThanHours = 72) {
  await db.systemEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - olderThanHours * 36e5) } } });
}
