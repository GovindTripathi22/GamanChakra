import { getSession } from "@/lib/auth/server";
import { bus, eventsSince, type BusEvent } from "@/lib/events/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/stream — Server-Sent Events: live news, agent thoughts, tasks, risk alerts, check-ins.
 * Instant delivery from the in-process bus + a DB cursor poll so events from the worker / other
 * instances arrive too.
 */
export async function GET(req: Request) {
  const session = await getSession();
  const orgId = session?.oid ?? null;
  const enc = new TextEncoder();
  const sent = new Set<string>();
  let cursor = new Date(Date.now() - 2000);
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (e: BusEvent) => {
        if (closed || sent.has(e.id)) return;
        if (e.orgId && e.orgId !== orgId) return;
        sent.add(e.id);
        if (sent.size > 2000) sent.clear();
        try { controller.enqueue(enc.encode(`id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)); } catch { /* closed */ }
      };
      const onEvent = (e: BusEvent) => send(e);
      bus.on("event", onEvent);
      controller.enqueue(enc.encode(`retry: 4000\nevent: hello\ndata: ${JSON.stringify({ at: new Date().toISOString(), authenticated: !!session })}\n\n`));
      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const rows = await eventsSince(cursor, orgId, 100);
          for (const r of rows) { send(r); cursor = new Date(r.createdAt); }
        } catch { /* db busy */ }
      }, 3000);
      const ping = setInterval(() => { if (!closed) try { controller.enqueue(enc.encode(`: ping\n\n`)); } catch { /* closed */ } }, 20000);
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll); clearInterval(ping);
        bus.off("event", onEvent);
        try { controller.close(); } catch { /* already closed */ }
      };
      req.signal.addEventListener("abort", close);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
