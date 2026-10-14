import { z } from "zod";
import QRCode from "qrcode";
import { cookies } from "next/headers";
import { handler, json, readJson, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { issueSessionForUser, sessionCookieOptions } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/token";
import { PLANS } from "@/lib/billing/plans";

const Body = z.object({ plan: z.enum(["pro", "team", "business"]), utr: z.string().regex(/^[A-Za-z0-9]{10,22}$/).optional() });

/**
 * Keyless UPI billing: returns a UPI intent link + QR for your merchant VPA (set MERCHANT_VPA, e.g. yourbusiness@okhdfcbank).
 * After paying, the customer submits the UTR/reference; the plan activates and the UTR is logged for reconciliation.
 */
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  const plan = PLANS.find((p) => p.id === b.plan)!;
  const vpa = process.env.MERCHANT_VPA;
  if (!b.utr) {
    if (!vpa) return json({ plan, mode: "contact_sales", message: "Online payment is not configured on this deployment. Set MERCHANT_VPA to accept UPI payments." });
    const note = `Voyage ${plan.name} ${session!.oid.slice(-6)}`;
    const upi = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(process.env.MERCHANT_NAME || "Voyage")}&am=${plan.priceInr}&cu=INR&tn=${encodeURIComponent(note)}`;
    return json({ plan, mode: "upi", upiLink: upi, qr: await QRCode.toDataURL(upi, { margin: 1, width: 260 }), note });
  }
  if (!vpa) throw new HttpError(400, "Payments are not configured");
  await db.organization.update({ where: { id: session!.oid }, data: { plan: plan.id } });
  await db.user.updateMany({ where: { orgId: session!.oid }, data: { plan: plan.id } });
  await db.financialLedgerEntry.create({ data: { type: "charge", amountPaise: plan.priceInr * 100, status: "pending", source: "upi", providerRef: b.utr, metadata: JSON.stringify({ orgId: session!.oid, plan: plan.id }) } }).catch(() => {});
  await db.auditEvent.create({ data: { actor: "USER", actorId: session!.uid, entity: "Billing", entityId: session!.oid, event: "plan_activated", data: JSON.stringify({ plan: plan.id, utr: b.utr }) } });
  (await cookies()).set(SESSION_COOKIE, await issueSessionForUser(session!.uid), sessionCookieOptions(req));
  return json({ ok: true, plan: plan.id });
}, { auth: "required", roles: ["owner", "admin"] });
