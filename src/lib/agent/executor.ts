import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { publish, safeJson } from "@/lib/events/bus";
import { advisory } from "@/lib/slm/nlg";
import { findPlace, haversineKm } from "@/lib/geo/gazetteer";
import { findAlternatives } from "./alternatives";
import { estimateCompensation } from "@/lib/claims/calculator";
import { deliverWebhooks } from "@/lib/webhooks";
import { generate, CHAKRA_SYSTEM_PROMPT } from "@/lib/slm/generative";
import type { NewsCategory, Severity } from "@/lib/slm/labels";
import type { AgentTask } from "@prisma/client";

const APP_URL = () => process.env.APP_URL || "http://localhost:3000";

async function subjectInfo(type: string, id: string) {
  if (type === "traveler") {
    const t = await db.traveler.findUnique({ where: { id } });
    return t ? { name: t.name, destination: t.destinationCity, phone: t.phone, email: t.email, orgId: t.orgId, ownerId: null as string | null, homeCity: t.homeCity, transportMode: t.transportMode } : null;
  }
  const trip = await db.trip.findUnique({ where: { id } });
  return trip ? { name: trip.title, destination: trip.destination, phone: null, email: null, orgId: trip.orgId, ownerId: trip.ownerId, homeCity: trip.origin, transportMode: "flight" } : null;
}

/** Execute one agent task. Idempotent: executing an already-executed task returns its stored result. */
export async function executeTask(taskId: string, actor = "agent"): Promise<AgentTask> {
  const existing = await db.agentTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error("Task not found");
  if (existing.status === "executed" || existing.status === "executing") return existing;
  if (existing.status === "rejected") throw new Error("Task was rejected");
  // Atomic claim: only one caller can move the task into "executing" (prevents double execution on double-clicks / overlapping cycles)
  const claim = await db.agentTask.updateMany({ where: { id: taskId, status: { in: ["proposed", "approved", "failed", "recorded"] } }, data: { status: "executing" } });
  if (claim.count === 0) return (await db.agentTask.findUnique({ where: { id: taskId } }))!;
  const task = existing;
  const payload = safeJson<Record<string, unknown>>(task.payload);
  const subject = await subjectInfo(task.subjectType, task.subjectId);
  const event = task.newsEventId ? await db.newsEvent.findUnique({ where: { id: task.newsEventId } }) : null;
  let result: Record<string, unknown> = {};
  if (!subject) {
    const skipped = await db.agentTask.update({ where: { id: task.id }, data: { status: "executed", result: JSON.stringify({ skipped: "The traveller or trip no longer exists" }), decidedBy: task.decidedBy ?? actor, decidedAt: task.decidedAt ?? new Date() } });
    return skipped;
  }

  try {
    switch (task.kind) {
      case "advisory":
      case "notify":
      case "escalate": {
        const adv = advisory({ title: event?.title ?? task.detail, category: (event?.category ?? "transport_disruption") as NewsCategory, severity: (event?.severity ?? "moderate") as Severity, place: event?.placeName ?? subject?.destination, travelerName: subject?.name });
        const hi = advisory({ title: event?.title ?? task.detail, category: (event?.category ?? "transport_disruption") as NewsCategory, severity: (event?.severity ?? "moderate") as Severity, place: event?.placeName ?? subject?.destination, travelerName: subject?.name, lang: "hi" });
        let body = adv.body;
        const polished = await generate([{ role: "system", content: CHAKRA_SYSTEM_PROMPT }, { role: "user", content: `CONTEXT: ${event?.title ?? task.detail}. Traveller: ${subject?.name} in ${subject?.destination}.\nWrite a 2-sentence calm advisory.` }], { maxTokens: 120, timeoutMs: 6000 });
        if (polished) body = polished;
        const wa = subject?.phone ? `https://wa.me/${subject.phone.replace(/\D/g, "")}?text=${encodeURIComponent(adv.sms)}` : null;
        if (task.kind === "advisory") { result = { advisory: { en: { ...adv, body }, hi }, whatsappLink: wa, generative: !!polished }; break; }
        const sev = task.kind === "escalate" ? "critical" : (event?.severity ?? "moderate");
        const n = await db.notification.create({
          data: { orgId: subject?.orgId ?? task.orgId, userId: subject?.ownerId ?? null, title: task.kind === "escalate" ? `ESCALATION · ${task.title}` : adv.headline || task.title, body, severity: sev, link: task.subjectType === "trip" ? `/trip/${task.subjectId}` : "/duty-of-care" },
        });
        await publish("notification", { id: n.id, title: n.title, body: n.body, severity: n.severity, link: n.link }, n.orgId);
        result = { notificationId: n.id, advisory: { en: { ...adv, body }, hi }, whatsappLink: wa, generative: !!polished };
        break;
      }
      case "checkin": {
        if (task.subjectType !== "traveler") { result = { skipped: "check-ins apply to travellers" }; break; }
        const token = randomBytes(18).toString("base64url");
        const req = await db.checkinRequest.create({
          data: { token, travelerId: task.subjectId, newsEventId: task.newsEventId, reason: event?.title ?? task.detail, expiresAt: new Date(Date.now() + 48 * 36e5) },
        });
        const link = `${APP_URL()}/checkin/${token}`;
        const msg = `Voyage safety check: ${event?.title?.replace(/^drill:\s*/i, "") ?? "an incident near you"}. Tap to confirm you're safe: ${link}`;
        result = { checkinId: req.id, link, whatsappLink: subject?.phone ? `https://wa.me/${subject.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}` : null, smsText: msg, mailto: subject?.email ? `mailto:${subject.email}?subject=${encodeURIComponent("Are you safe?")}&body=${encodeURIComponent(msg)}` : null };
        await publish("checkin.update", { travelerId: task.subjectId, status: "pending", link }, subject?.orgId ?? task.orgId);
        break;
      }
      case "reroute":
      case "hold_rebooking": {
        const dest = findPlace(subject?.destination ?? "");
        const origin = findPlace(subject?.homeCity ?? "") ?? null;
        const alts = dest ? findAlternatives({ origin, destination: dest, disruptedMode: String(payload.disruptedMode ?? subject?.transportMode ?? "flight"), disruptionCategory: String(payload.category ?? event?.category ?? "") }) : [];
        result = { options: alts, recommended: alts[0] ?? null };
        if (task.kind === "hold_rebooking" && alts[0]) result.sandboxHold = { ref: `SBX-${randomBytes(3).toString("hex").toUpperCase()}`, option: alts[0].id, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), note: "Sandbox hold — no money moved." };
        break;
      }
      case "reschedule": {
        if (task.subjectType === "trip") {
          const items = await db.tripItem.findMany({ where: { tripId: task.subjectId, type: "activity" }, take: 50 });
          const outdoor = items.filter((i) => /outdoor_high|outdoor/.test(i.meta) || /beach|fort|trek|park|cruise|boat|safari|market|ghat/i.test(i.title));
          for (const i of outdoor.slice(0, 6)) await db.tripItem.update({ where: { id: i.id }, data: { status: "at_risk" } });
          result = { flaggedItems: outdoor.slice(0, 6).map((i) => ({ id: i.id, title: i.title })), suggestion: "Move flagged outdoor activities to the morning or swap for indoor alternatives; added 45-minute transfer buffers." };
        } else result = { suggestion: "Advise traveller to keep the day flexible." };
        break;
      }
      case "compensation_claim": {
        const dest = findPlace(subject?.destination ?? "");
        const origin = findPlace(subject?.homeCity ?? "Delhi");
        const title = String(payload.eventTitle ?? event?.title ?? "");
        const kind = /cancel/i.test(title) ? "cancellation" : /denied/i.test(title) ? "denied_boarding" : "delay";
        const hours = Number((title.match(/(\d+)\s*(?:hours?|hrs?)/i) || [])[1] ?? 4);
        const distanceKm = dest && origin ? Math.max(100, haversineKm(origin, dest)) : 1200;
        result = { estimate: estimateCompensation({ kind, departureCountry: origin?.countryCode ?? "IN", arrivalCountry: dest?.countryCode ?? "IN", distanceKm, delayHoursAtArrival: hours, noticeDays: 0, extraordinary: /fog|weather|storm|strike|security|cyclone/i.test(title) }) };
        break;
      }
      case "webhook": {
        const orgId = subject?.orgId ?? task.orgId;
        result = orgId ? await deliverWebhooks(orgId, String(payload.event ?? "risk.exposure"), { task: task.title, subject: { type: task.subjectType, id: task.subjectId, name: subject?.name }, event: event ? { id: event.id, title: event.title, category: event.category, severity: event.severity, place: event.placeName } : null, score: payload.score }) : { delivered: 0, failed: 0 };
        break;
      }
    }
    const updated = await db.agentTask.update({ where: { id: task.id }, data: { status: "executed", result: JSON.stringify(result), decidedBy: task.decidedBy ?? actor, decidedAt: task.decidedAt ?? new Date() } });
    await db.auditEvent.create({ data: { actor: actor === "agent" ? "AGENT" : "USER", actorId: actor, entity: "AgentTask", entityId: task.id, event: "executed", data: JSON.stringify({ kind: task.kind }) } }).catch(() => {});
    await publish("agent.task", { id: updated.id, kind: updated.kind, status: updated.status, title: updated.title }, updated.orgId);
    return updated;
  } catch (e) {
    const failed = await db.agentTask.update({ where: { id: task.id }, data: { status: "failed", result: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) } });
    await publish("agent.task", { id: failed.id, kind: failed.kind, status: "failed", title: failed.title }, failed.orgId);
    return failed;
  }
}

export async function decideTask(taskId: string, decision: "approve" | "reject", userId: string, orgId: string | null): Promise<AgentTask> {
  const task = await db.agentTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (orgId && task.orgId && task.orgId !== orgId) throw new Error("Forbidden");
  if (task.status !== "proposed") throw new Error(`Task already ${task.status}`);
  // Compare-and-set so two simultaneous approvals cannot both win.
  const next = decision === "reject" ? "rejected" : "approved";
  const won = await db.agentTask.updateMany({ where: { id: taskId, status: "proposed" }, data: { status: next, decidedBy: userId, decidedAt: new Date() } });
  if (won.count === 0) throw new Error("Task already decided");
  if (decision === "reject") {
    const t = (await db.agentTask.findUnique({ where: { id: taskId } }))!;
    await publish("agent.task", { id: t.id, kind: t.kind, status: t.status, title: t.title }, t.orgId);
    return t;
  }
  return executeTask(taskId, userId);
}
