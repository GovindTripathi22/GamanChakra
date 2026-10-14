import { safeJson } from "@/lib/events/bus";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** Outbound, HMAC-signed partner webhooks (your customers' systems subscribe to Voyage events). */
export function newWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signPayload(secret: string, body: string, ts: number): string {
  return createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
}

export async function deliverWebhooks(orgId: string, event: string, data: unknown): Promise<{ delivered: number; failed: number }> {
  const endpoints = await db.webhookEndpoint.findMany({ where: { orgId, isActive: true } });
  let delivered = 0, failed = 0;
  for (const ep of endpoints) {
    const parsed = safeJson<unknown>(ep.events, ["*"]);
    const events = Array.isArray(parsed) ? parsed.map(String) : ["*"];
    if (!events.includes("*") && !events.includes(event)) continue;
    const body = JSON.stringify({ id: `evt_${randomBytes(8).toString("hex")}`, type: event, createdAt: new Date().toISOString(), data });
    const ts = Math.floor(Date.now() / 1000);
    let status = 0;
    try {
      const r = await fetch(ep.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-voyage-signature": `t=${ts},v1=${signPayload(ep.secret, body, ts)}`, "user-agent": "Voyage-Webhooks/1.0" },
        body,
        signal: AbortSignal.timeout(5000),
      });
      status = r.status;
      if (r.ok) delivered++; else failed++;
    } catch {
      failed++;
    }
    await db.webhookEndpoint.update({ where: { id: ep.id }, data: { lastStatus: status } }).catch(() => {});
  }
  return { delivered, failed };
}
