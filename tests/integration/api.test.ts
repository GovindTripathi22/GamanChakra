import { describe, it, expect, beforeAll } from "vitest";
import { jar, req, ctx, body } from "./helpers";
import { SESSION_COOKIE } from "@/lib/auth/token";
import { db } from "@/lib/db";
import * as signup from "@/app/api/auth/signup/route";
import * as signin from "@/app/api/auth/signin/route";
import * as me from "@/app/api/auth/me/route";
import * as demo from "@/app/api/auth/demo/route";
import * as jarvis from "@/app/api/jarvis/route";
import * as risk from "@/app/api/risk/route";
import * as leaderboard from "@/app/api/risk/leaderboard/route";
import * as news from "@/app/api/news/route";
import * as claims from "@/app/api/claims/route";
import * as travelers from "@/app/api/travelers/route";
import * as importCsv from "@/app/api/travelers/import/route";
import * as bulk from "@/app/api/checkins/bulk/route";
import * as checkin from "@/app/api/checkin/[token]/route";
import * as automations from "@/app/api/automations/route";
import * as automation from "@/app/api/automations/[id]/route";
import * as tasks from "@/app/api/agent/tasks/route";
import * as autonomy from "@/app/api/agent/autonomy/route";
import * as agentRun from "@/app/api/agent/run/route";
import * as overview from "@/app/api/overview/route";
import * as health from "@/app/api/health/route";
import * as slm from "@/app/api/slm/route";
import * as v1 from "@/app/api/v1/risk/route";
import * as keys from "@/app/api/developers/keys/route";
import * as fx from "@/app/api/fx/route";
import * as notifications from "@/app/api/notifications/route";

const login = async () => { jar.clear(); const r = await demo.POST(req("/api/auth/demo", { body: {} }), ctx({})); expect(r.status).toBe(200); };

describe("auth", () => {
  it("signs up, sets an httpOnly session, and /me returns the user", async () => {
    jar.clear();
    const r = await signup.POST(req("/api/auth/signup", { body: { name: "Riya Sen", email: `riya${Date.now()}@acme.com`, password: "supersecret1", orgName: "Acme Travel", orgKind: "tmc" } }), ctx({}));
    expect(r.status).toBe(201);
    expect(jar.get(SESSION_COOKIE)).toBeTruthy();
    const m = await body(await me.GET(req("/api/auth/me"), ctx({})));
    expect(m.user.name).toBe("Riya Sen");
    expect(m.org.kind).toBe("tmc");
  });
  it("rejects duplicate emails (409), bad input (400) and wrong passwords (401)", async () => {
    const email = `dup${Date.now()}@acme.com`;
    await signup.POST(req("/x", { body: { name: "A B", email, password: "password123" } }), ctx({}));
    expect((await signup.POST(req("/x", { body: { name: "A B", email, password: "password123" } }), ctx({}))).status).toBe(409);
    expect((await signup.POST(req("/x", { body: { name: "A", email: "nope", password: "1" } }), ctx({}))).status).toBe(400);
    expect((await signin.POST(req("/x", { body: { email, password: "wrongpassword" } }), ctx({}))).status).toBe(401);
    expect((await signin.POST(req("/x", { body: { email, password: "password123" } }), ctx({}))).status).toBe(200);
  });
  it("protected endpoints require a session", async () => {
    jar.clear();
    expect((await travelers.GET(req("/api/travelers"), ctx({}))).status).toBe(401);
    expect((await agentRun.POST(req("/api/agent/run", { body: {} }), ctx({}))).status).toBe(401);
  });
});

describe("Jarvis voice API", () => {
  beforeAll(login);
  it.each([
    ["Is Kathmandu safe right now?", "safety_check", "risk"],
    ["What's happening in the world?", "news_brief", "news"],
    ["Plan 3 days in Jaipur under 30k", "plan_trip", "plan"],
    ["My flight from Mumbai to Goa got cancelled", "disruption_help", "routes"],
    ["Who is affected right now?", "affected_travelers", "travelers"],
    ["Am I owed compensation for a 5 hour delay from Delhi to Goa?", "compensation_claim", "claim"],
    ["How do I say thank you in Japanese?", "phrase_translate", "phrase"],
    ["Convert 100 dollars to rupees", "currency_convert", "fx"],
    ["Emergency, I need an ambulance", "emergency_sos", "emergency"],
    ["What should I pack for Leh?", "packing_list", "list"],
  ])("%s", async (text, intent, card) => {
    const r = await body(await jarvis.POST(req("/api/jarvis", { body: { text } }), ctx({})));
    expect(r.intent).toBe(intent);
    expect(r.cards[0]?.type).toBe(card);
    expect(r.reply.length).toBeGreaterThan(10);
    expect(r.speak).not.toMatch(/₹/);
  });
  it("answers in Hindi when spoken to in Hindi", async () => {
    const r = await body(await jarvis.POST(req("/api/jarvis", { body: { text: "क्या दुबई जाना सुरक्षित है?", lang: "hi-IN" } }), ctx({})));
    expect(r.lang).toBe("hi-IN");
    expect(r.reply).toMatch(/[ऀ-ॿ]/);
  });
  it("can change autonomy by voice and navigate", async () => {
    const r = await body(await jarvis.POST(req("/api/jarvis", { body: { text: "set autonomy to L2" } }), ctx({})));
    expect(r.reply).toMatch(/L2/);
    expect((await body(await autonomy.GET(req("/x"), ctx({})))).level).toBe("L2");
    await autonomy.POST(req("/x", { body: { level: "L3" } }), ctx({}));
    expect((await body(await jarvis.POST(req("/x", { body: { text: "open mission control" } }), ctx({})))).navigate).toBe("/command");
  });
  it("validates input", async () => expect((await jarvis.POST(req("/x", { body: { text: "" } }), ctx({}))).status).toBe(400));
});

describe("risk, news, claims, slm, fx, health", () => {
  it("risk index for a known place; 400/404 otherwise", async () => {
    const r = await body(await risk.GET(req("/api/risk?place=Kathmandu"), ctx({})));
    expect(r.score).toBeGreaterThan(40);
    expect((await risk.GET(req("/api/risk"), ctx({}))).status).toBe(400);
    expect((await risk.GET(req("/api/risk?place=Atlantis"), ctx({}))).status).toBe(404);
    expect((await body(await leaderboard.GET(req("/x"), ctx({})))).cities.length).toBeGreaterThan(3);
  });
  it("news list with filters", async () => {
    const all = await body(await news.GET(req("/api/news?hours=48"), ctx({})));
    expect(all.events.length).toBeGreaterThan(5);
    const nd = await body(await news.GET(req("/api/news?category=natural_disaster&minSeverity=high"), ctx({})));
    expect(nd.events.every((e: { category: string; severity: string }) => e.category === "natural_disaster" && ["high", "critical"].includes(e.severity))).toBe(true);
  });
  it("claims estimate with letter", async () => {
    const r = await body(await claims.POST(req("/api/claims", { body: { kind: "delay", from: "Paris", to: "Delhi", delayHours: 5 } }), ctx({})));
    expect(r.regime).toBe("EU261"); expect(r.amount).toBe(600); expect(r.letter).toMatch(/Regulation/);
  });
  it("SLM playground", async () => {
    const r = await body(await slm.POST(req("/api/slm", { body: { text: "Curfew imposed in Imphal after clashes", task: "news" } }), ctx({})));
    expect(r.output.category).toBe("civil_unrest");
  });
  it("fx and health", async () => {
    expect((await body(await fx.GET(req("/api/fx?amount=10&from=EUR&to=INR"), ctx({})))).result).toBeGreaterThan(500);
    expect((await fx.GET(req("/api/fx?amount=10&from=XXX&to=INR"), ctx({}))).status).toBe(400);
    const h = await body(await health.GET());
    expect(h.db).toBe(true); expect(h.slm.name).toBe("chakra-nano");
  });
});

describe("duty of care end-to-end", () => {
  beforeAll(login);
  let tid = "";
  it("adds a traveller (and validates unknown cities)", async () => {
    const r = await travelers.POST(req("/api/travelers", { body: { name: "Test Traveller", destinationCity: "Bangkok", tripStart: new Date().toISOString(), tripEnd: new Date(Date.now() + 2 * 864e5).toISOString(), phone: "+919800000001" } }), ctx({}));
    expect(r.status).toBe(201);
    tid = (await body(r)).traveler.id;
    expect((await travelers.POST(req("/x", { body: { name: "X Y", destinationCity: "Atlantis", tripStart: "2026-10-13", tripEnd: "2026-10-14" } }), ctx({}))).status).toBe(400);
  });
  it("imports CSV", async () => {
    const csv = "name,destinationCity,tripStart,tripEnd\nCsv One,Dubai,2026-10-13,2026-10-20\nBad Row,Atlantis,2026-10-13,2026-10-20";
    const r = await body(await importCsv.POST(req("/api/travelers/import", { raw: csv }), ctx({})));
    expect(r.created).toBe(1); expect(r.errors).toHaveLength(1);
  });
  it("bulk check-in → traveller replies via public link → status updates + alert", async () => {
    const r = await body(await bulk.POST(req("/api/checkins/bulk", { body: { travelerIds: [tid] } }), ctx({})));
    expect(r.sent).toBe(1);
    const token = r.results[0].link.split("/checkin/")[1];
    expect(r.results[0].whatsappLink).toMatch(/^https:\/\/wa\.me\/919800000001/);
    const info = await body(await checkin.GET(req(`/api/checkin/${token}`), ctx({ token })));
    expect(info.status).toBe("pending");
    expect((await checkin.POST(req(`/x`, { body: { status: "needs_help", message: "Stuck at hotel" } }), ctx({ token }))).status).toBe(200);
    const t = await db.traveler.findUnique({ where: { id: tid } });
    expect(t?.safetyStatus).toBe("needs_help");
    const n = await body(await notifications.GET(req("/x"), ctx({})));
    expect(n.items.some((i: { title: string }) => i.title.includes("needs help"))).toBe(true);
    expect((await checkin.GET(req(`/x`), ctx({ token: "nope" }))).status).toBe(404);
  });
});

describe("automations, approvals inbox, overview", () => {
  beforeAll(login);
  it("creates, toggles and protects rules across orgs", async () => {
    const r = await automations.POST(req("/x", { body: { name: "Gulf flight chaos", trigger: "news_event", conditions: { categories: ["transport_disruption"], countries: ["AE"] }, actions: [{ type: "reroute" }] } }), ctx({}));
    expect(r.status).toBe(201);
    const id = (await body(r)).rule.id;
    expect((await automation.PATCH(req("/x", { method: "PATCH", body: { enabled: false } }), ctx({ id }))).status).toBe(200);
    // another org cannot touch it
    jar.clear();
    await signup.POST(req("/x", { body: { name: "Other Org", email: `o${Date.now()}@x.com`, password: "password123", orgKind: "tmc" } }), ctx({}));
    expect((await automation.DELETE(req("/x", { method: "DELETE" }), ctx({ id }))).status).toBe(404);
    await login();
    expect((await automation.DELETE(req("/x", { method: "DELETE" }), ctx({ id }))).status).toBe(200);
  });
  it("lists the approvals inbox with source events", async () => {
    const r = await body(await tasks.GET(req("/api/agent/tasks?status=executed"), ctx({})));
    expect(r.tasks.length).toBeGreaterThan(0);
    expect(r.tasks.some((t: { event: unknown }) => !!t.event)).toBe(true);
  });
  it("overview powers Mission Control", async () => {
    const r = await body(await overview.GET(req("/x"), ctx({})));
    expect(r.kpis.travelers).toBeGreaterThan(20);
    expect(r.events.length).toBeGreaterThan(5);
    expect(r.org.name).toBe("Demo Travel Co.");
  });
});

describe("partner API (sell the intelligence)", () => {
  beforeAll(login);
  it("issues a key, serves /api/v1/risk with it, rejects without", async () => {
    const k = await body(await keys.POST(req("/x", { body: { name: "OTA prod" } }), ctx({})));
    expect(k.apiKey).toMatch(/^voyage_agt_/);
    const ok = await v1.GET(new Request("http://t/api/v1/risk?place=Kathmandu", { headers: { authorization: `Bearer ${k.apiKey}` } }));
    expect(ok.status).toBe(200);
    expect((await body(ok)).score).toBeGreaterThan(0);
    expect((await v1.GET(new Request("http://t/api/v1/risk?place=Kathmandu", { headers: { authorization: "Bearer bad" } }))).status).toBe(401);
  });
});

describe("edge cases & concurrency", () => {
  beforeAll(login);
  it("concurrent approvals execute a task exactly once", async () => {
    const { decideTask } = await import("@/lib/agent/executor");
    const me = await body(await (await import("@/app/api/auth/me/route")).GET(req("/x"), ctx({})));
    const t = await db.agentTask.create({ data: { orgId: me.org.id, subjectType: "traveler", subjectId: (await db.traveler.findFirst({ where: { orgId: me.org.id } }))!.id, kind: "advisory", title: "race", detail: "race", status: "proposed", idempotencyKey: `race-${Date.now()}` } });
    const results = await Promise.allSettled([decideTask(t.id, "approve", "u1", me.org.id), decideTask(t.id, "approve", "u2", me.org.id), decideTask(t.id, "approve", "u3", me.org.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.agentTask.findUnique({ where: { id: t.id } }))!.status).toBe("executed");
  });
  it("tasks for deleted travellers are skipped, not crashed", async () => {
    const { executeTask } = await import("@/lib/agent/executor");
    const me = await body(await (await import("@/app/api/auth/me/route")).GET(req("/x"), ctx({})));
    const t = await db.agentTask.create({ data: { orgId: me.org.id, subjectType: "traveler", subjectId: "ghost", kind: "checkin", title: "ghost", detail: "ghost", status: "approved", idempotencyKey: `ghost-${Date.now()}` } });
    const r = await executeTask(t.id);
    expect(r.status).toBe("executed");
    expect(r.result).toMatch(/no longer exists/);
  });
  it("bad query params fall back to defaults instead of 500", async () => {
    expect((await news.GET(req("/api/news?hours=abc&limit=-5&country=INDIA"), ctx({}))).status).toBe(200);
  });
  it("malformed JSON bodies get a 4xx, never a 500", async () => {
    const r = await jarvis.POST(new Request("http://t/api/jarvis", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" }), ctx({}));
    expect(r.status).toBe(400);
    const c = await claims.POST(new Request("http://t/api/claims", { method: "POST", headers: { "content-type": "application/json" }, body: "[1,2]" }), ctx({}));
    expect(c.status).toBe(400);
  });
  it("MCP endpoint validates input", async () => {
    const mcp = await import("@/app/api/protocol/mcp/route");
    const bad = await mcp.POST(new Request("http://t/api/protocol/mcp", { method: "POST", body: "nope" }));
    expect([400, 401]).toContain(bad.status);
  });
  it("unknown traveller ids in bulk check-in are ignored", async () => {
    const r = await body(await bulk.POST(req("/x", { body: { travelerIds: ["does-not-exist"] } }), ctx({})));
    expect(r.sent).toBe(0);
  });
  it("expired check-in links are refused", async () => {
    const t = await db.traveler.findFirst();
    const c = await db.checkinRequest.create({ data: { token: `exp-${Date.now()}`, travelerId: t!.id, reason: "test", expiresAt: new Date(Date.now() - 1000) } });
    expect((await checkin.POST(req("/x", { body: { status: "safe" } }), ctx({ token: c.token }))).status).toBe(410);
    expect((await body(await checkin.GET(req("/x"), ctx({ token: c.token })))).status).toBe("expired");
  });
});
