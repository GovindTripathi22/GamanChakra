"use client";

import { useCallback, useEffect, useRef, useState } from "react";

async function readBody(r: Response): Promise<Record<string, unknown>> {
  const text = await r.text().catch(() => "");
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: r.ok ? "Unexpected response from server" : `Server error (${r.status})` }; }
}

/** Tiny data hook with polling, manual refresh and race-safe responses (no external data library). */
export function useApi<T>(url: string | null, opts: { refreshMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const seq = useRef(0); // only the newest request may write state
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    if (!url) return;
    const mine = ++seq.current;
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await readBody(r);
      if (!mounted.current || mine !== seq.current) return;
      if (!r.ok) setError(String(j.error ?? `HTTP ${r.status}`));
      else { setData(j as T); setError(null); }
    } catch {
      if (mounted.current && mine === seq.current) setError("Network unavailable — retrying shortly");
    } finally {
      if (mounted.current && mine === seq.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) { setLoading(false); return; }
    setLoading(true);
    load();
    if (!opts.refreshMs) return () => { seq.current++; };
    const t = setInterval(() => { if (document.visibilityState !== "hidden") load(); }, opts.refreshMs);
    return () => { clearInterval(t); seq.current++; };
  }, [load, url, opts.refreshMs]);
  return { data, error, loading, reload: load, setData };
}

/** JSON request helper. Always throws a readable Error (never a raw TypeError) on failure. */
export async function postJson<T = unknown>(url: string, body?: unknown, method = "POST"): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error("Network unavailable. Check your connection and try again.");
  }
  const j = await readBody(r);
  if (!r.ok) {
    const issue = (j.issues as { path: string; message: string }[] | undefined)?.[0];
    throw new Error(issue ? `${issue.path || "input"}: ${issue.message}` : String(j.error ?? (r.status === 429 ? "Too many requests — please wait a moment" : `Request failed (${r.status})`)));
  }
  return j as T;
}

/** Copy text; resolves false instead of throwing when the clipboard is unavailable (HTTP, denied permission). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

export interface StreamEvent { id: string; type: string; orgId: string | null; payload: Record<string, unknown>; createdAt: string }

/* ------------------------------------------------------------------ */
/* One shared EventSource per tab (avoids exhausting HTTP/1.1 sockets) */
/* ------------------------------------------------------------------ */
type Listener = (e: StreamEvent) => void;
const TYPES = ["news.ingested", "news.event", "agent.run", "agent.step", "agent.task", "risk.alert", "checkin.update", "notification"];
const listeners = new Set<Listener>();
const statusListeners = new Set<(c: boolean) => void>();
let source: EventSource | null = null;
let connected = false;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function setConnected(c: boolean) { connected = c; statusListeners.forEach((f) => f(c)); }
function ensureSource() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  if (source || typeof EventSource === "undefined") return;
  try {
    source = new EventSource("/api/stream");
  } catch { source = null; return; }
  const dispatch = (ev: MessageEvent) => {
    let parsed: StreamEvent | null = null;
    try { parsed = JSON.parse(ev.data); } catch { return; }
    if (!parsed) return;
    for (const l of listeners) { try { l(parsed); } catch (err) { console.warn("[stream] listener error", err); } }
  };
  TYPES.forEach((t) => source!.addEventListener(t, dispatch as EventListener));
  source.addEventListener("hello", () => setConnected(true));
  source.onerror = () => setConnected(false); // EventSource reconnects by itself
}
function releaseSource() {
  if (listeners.size > 0 || statusListeners.size > 0) return;
  closeTimer = setTimeout(() => { source?.close(); source = null; setConnected(false); }, 1500);
}

/** Subscribe to the live Server-Sent Events stream. */
export function useEventStream(onEvent: Listener, enabled = true) {
  const cb = useRef(onEvent);
  useEffect(() => { cb.current = onEvent; }, [onEvent]);
  const [isConnected, setIsConnected] = useState(connected);
  useEffect(() => {
    if (!enabled) return;
    const l: Listener = (e) => cb.current(e);
    listeners.add(l);
    statusListeners.add(setIsConnected);
    ensureSource();
    setIsConnected(connected);
    return () => { listeners.delete(l); statusListeners.delete(setIsConnected); releaseSource(); };
  }, [enabled]);
  return isConnected;
}
