import { vi } from "vitest";

/** In-memory cookie jar standing in for next/headers in route-handler tests. */
export const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
    set: (k: string, v: string) => { jar.set(k, v); },
    delete: (k: string) => { jar.delete(k); },
  }),
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
}));

export function req(url: string, init: { method?: string; body?: unknown; raw?: string } = {}) {
  return new Request(`http://test.local${url}`, {
    method: init.method ?? (init.body !== undefined || init.raw !== undefined ? "POST" : "GET"),
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
}
export const ctx = <T>(params: T) => ({ params: Promise.resolve(params) });
export async function body<T = any>(r: Response): Promise<T> { return (await r.json()) as T; }
