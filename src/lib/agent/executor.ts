import { randomBytes } from "node:crypto";
import { db, isDbAvailable } from "@/lib/db";
import { publish, safeJson } from "@/lib/events/bus";
import { advisory } from "@/lib/slm/nlg";
import { findPlace, haversineKm } from "@/lib/geo/gazetteer";
import { findAlternatives } from "./alternatives";
import { estimateCompensation } from "@/lib/claims/calculator";
import { deliverWebhooks } from "@/lib/webhooks";
import { generate, CHAKRA_SYSTEM_PROMPT } from "@/lib/slm/generative";
import { RAW_DEMO_TRAVELERS } from "@/lib/demo/travelers-data";
import { agentMemoryStore } from "./memory-store";
import type { NewsCategory, Severity } from "@/lib/slm/labels";
import type { AgentTask } from "@prisma/client";

const APP_URL = () => process.env.APP_URL || "http://localhost:3000";

async function subjectInfo(type: string, id: string) {
  const dbOk = await isDbAvailable();
  if (type === "traveler") {
    if (dbOk) {
      try {
        const t = await db.traveler.findUnique({ where: { id } });
        if (t) return { name: t.name, destination: t.destinationCity, phone: t.phone, email: t.email, orgId: t.orgId, ownerId: null as string | null, homeCity: t.homeCity, transportMode: t.transportMode };
      } catch {}
    }
    const demo = RAW_DEMO_TRAVELERS.find((_, idx) => `demo-traveler-${idx + 1}` === id);
    if (demo) {
      const [name, _dept, home, dest, _off, _len, mode] = demo;
      return { name, destination: dest, phone: "+919876543210", email: `${name.split(" ")[0].toLowerCase()}@demo-travel.co`, orgId: "demo-travel-co", ownerId: null as string | null, homeCity: home, transportMode: mode };
    }
    return null;
  }
  if (dbOk) {
    try {
      const trip = await db.trip.findUnique({ where: { id } });
      if (trip) return { name: trip.title, destination: trip.destination, phone: null, email: null, orgId: trip.orgId, ownerId: trip.ownerId, homeCity: trip.origin, transportMode: "flight" };
    } catch {}
  }
  return null;
}

/** Execute one agent task. Idempotent: executing an already-executed task returns its stored result. */
export async function executeTask(taskId: string, actor = "agent"): Promise<AgentTask> {
  const dbOk = await isDbAvailable();
  let existing: any = null;
  if (dbOk) {
    try {
      existing = await db.agentTask.findUnique({ where: { id: taskId } });
    } catch {}
  }
  if (!existing) existing = agentMemoryStore.findTaskById(taskId);
  if (!existing) throw new Error("Task not found");
  if (existing.status === "executed" || existing.status === "executing") return existing;
  if (existing.status === "rejected") throw new Error("Task was rejected");

  // Attempt atomic claim in DB
  if (dbOk) {
    try {
      const claim = await db.agentTask.updateMany({ where: { id: taskId, status: { in: ["proposed", "approved", "failed", "recorded"] } }, data: { status: "executing" } });
      if (claim.count === 0 && existing.status === "executing") return existing;
    } catch {}
  } else {
    agentMemoryStore.updateTask(taskId, { status: "executing" });
  }

  const task = existing;
  const payload = safeJson<Record<string, unknown>>(task.payload);
  const subject = await subjectInfo(task.subjectType, task.subjectId);
  let event: any = null;
  if (task.newsEventId && dbOk) {
    try { event = await db.newsEvent.findUnique({ where: { id: task.newsEventId } }); } catch {}
  }
  let result: Record<string, unknown> = {};
  if (!subject) {
    if (dbOk) {
      try {
        const skipped = await db.agentTask.update({ where: { id: task.id }, data: { status: "executed", result: JSON.stringify({ skipped: "The traveller or trip no longer exists" }), decidedBy: task.decidedBy ?? actor, decidedAt: task.decidedAt ?? new Date() } });
        return skipped;
      } catch {}
    }
    agentMemoryStore.updateTask(task.id, { status: "executed", result: JSON.stringify({ skipped: "The traveller or trip no longer exists" }), decidedBy: task.decidedBy ?? actor, decidedAt: new Date().toISOString() });
    return existing;
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
        let nId = `notif_${Date.now()}`;
        if (dbOk) {
          try {
            const n = await db.notification.create({
              data: { orgId: subject?.orgId ?? task.orgId, userId: subject?.ownerId ?? null, title: task.kind === "escalate" ? `ESCALATION · ${task.title}` : adv.headline || task.title, body, severity: sev, link: task.subjectType === "trip" ? `/trip/${task.subjectId}` : "/duty-of-care" },
            });
            nId = n.id;
          } catch {}
        }
        await publish("notification", { id: nId, title: task.kind === "escalate" ? `ESCALATION · ${task.title}` : adv.headline || task.title, body, severity: sev, link: task.subjectType === "trip" ? `/trip/${task.subjectId}` : "/duty-of-care" }, subject?.orgId ?? task.orgId);
        result = { notificationId: nId, advisory: { en: { ...adv, body }, hi }, whatsappLink: wa, generative: !!polished };
        break;
      }
      case "checkin": {
        if (task.subjectType !== "traveler") { result = { skipped: "check-ins apply to travellers" }; break; }
        const token = randomBytes(18).toString("base64url");
        let reqId = `chk_${Date.now()}`;
        if (dbOk) {
          try {
            const req = await db.checkinRequest.create({
              data: { token, travelerId: task.subjectId, newsEventId: task.newsEventId, reason: event?.title ?? task.detail, expiresAt: new Date(Date.now() + 48 * 36e5) },
            });
            reqId = req.id;
          } catch {}
        }
        const link = `${APP_URL()}/checkin/${token}`;
        const msg = `Voyage safety check: ${event?.title?.replace(/^drill:\s*/i, "") ?? "an incident near you"}. Tap to confirm you're safe: ${link}`;
        result = { checkinId: reqId, link, whatsappLink: subject?.phone ? `https://wa.me/${subject.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}` : null, smsText: msg, mailto: subject?.email ? `mailto:${subject.email}?subject=${encodeURIComponent("Are you safe?")}&body=${encodeURIComponent(msg)}` : null };
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
          let flagged: any[] = [];
          if (dbOk) {
            try {
              const items = await db.tripItem.findMany({ where: { tripId: task.subjectId, type: "activity" }, take: 50 });
              const outdoor = items.filter((i) => /outdoor_high|outdoor/.test(i.meta) || /beach|fort|trek|park|cruise|boat|safari|market|ghat/i.test(i.title));
              for (const i of outdoor.slice(0, 6)) await db.tripItem.update({ where: { id: i.id }, data: { status: "at_risk" } });
              flagged = outdoor.slice(0, 6).map((i) => ({ id: i.id, title: i.title }));
            } catch {}
          }
          result = { flaggedItems: flagged, suggestion: "Move flagged outdoor activities to the morning or swap for indoor alternatives; added 45-minute transfer buffers." };
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
    let updated: any = null;
    if (dbOk) {
      try {
        updated = await db.agentTask.update({ where: { id: task.id }, data: { status: "executed", result: JSON.stringify(result), decidedBy: task.decidedBy ?? actor, decidedAt: task.decidedAt ?? new Date() } });
      } catch {}
    }
    if (!updated) {
      updated = agentMemoryStore.updateTask(task.id, { status: "executed", result: JSON.stringify(result), decidedBy: task.decidedBy ?? actor, decidedAt: new Date().toISOString() });
    }
    if (dbOk) {
      try {
        await db.auditEvent.create({ data: { actor: actor === "agent" ? "AGENT" : "USER", actorId: actor, entity: "AgentTask", entityId: task.id, event: "executed", data: JSON.stringify({ kind: task.kind }) } });
      } catch {}
    }
    await publish("agent.task", { id: updated.id, kind: updated.kind, status: updated.status, title: updated.title }, updated.orgId);
    return updated;
  } catch (e) {
    let failed: any = null;
    if (dbOk) {
      try {
        failed = await db.agentTask.update({ where: { id: task.id }, data: { status: "failed", result: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) } });
      } catch {}
    }
    if (!failed) {
      failed = agentMemoryStore.updateTask(task.id, { status: "failed", result: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) });
    }
    await publish("agent.task", { id: failed?.id ?? task.id, kind: failed?.kind ?? task.kind, status: "failed", title: failed?.title ?? task.title }, failed?.orgId ?? task.orgId);
    return failed ?? task;
  }
}

export async function decideTask(taskId: string, decision: "approve" | "reject", userId: string, orgId: string | null): Promise<AgentTask> {
  const dbOk = await isDbAvailable();
  let task: any = null;
  if (dbOk) {
    try {
      task = await db.agentTask.findUnique({ where: { id: taskId } });
    } catch {}
  }
  if (!task) task = agentMemoryStore.findTaskById(taskId);
  if (!task) throw new Error("Task not found");
  if (orgId && task.orgId && task.orgId !== orgId) throw new Error("Forbidden");
  if (task.status !== "proposed") throw new Error(`Task already ${task.status}`);

  // Compare-and-set
  const next = decision === "reject" ? "rejected" : "approved";
  if (dbOk) {
    try {
      const won = await db.agentTask.updateMany({ where: { id: taskId, status: "proposed" }, data: { status: next, decidedBy: userId, decidedAt: new Date() } });
      if (won.count === 0) throw new Error("Task already decided");
    } catch {}
  } else {
    agentMemoryStore.updateTask(taskId, { status: next, decidedBy: userId, decidedAt: new Date().toISOString() });
  }

  if (decision === "reject") {
    let t: any = null;
    if (dbOk) {
      try { t = await db.agentTask.findUnique({ where: { id: taskId } }); } catch {}
    }
    if (!t) t = agentMemoryStore.findTaskById(taskId);
    await publish("agent.task", { id: t.id, kind: t.kind, status: t.status, title: t.title }, t.orgId);
    return t;
  }
  return executeTask(taskId, userId);
}
