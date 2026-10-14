import { describe, it, expect, beforeAll } from "vitest";
import "./helpers";
import { db } from "@/lib/db";
import { ensureDemoWorkspace } from "@/lib/demo/seed";
import { ingestNews } from "@/lib/news/pipeline";
import { runAgentCycle } from "@/lib/agent/runner";
import { decideTask, executeTask } from "@/lib/agent/executor";
import { loadSubjects } from "@/lib/risk/engine";

let orgId = "";
beforeAll(async () => {
  const { org } = await ensureDemoWorkspace();
  orgId = org.id;
});

describe("real-time ingestion (drill mode, offline-safe)", () => {
  it("ingests, classifies and de-duplicates across runs", async () => {
    const first = await ingestNews({ mode: "drill" });
    expect(first.mode).toBe("drill");
    expect(first.relevant).toBeGreaterThan(10);
    expect(await db.newsEvent.count({ where: { provenance: "sample" } })).toBeGreaterThan(10);
    const second = await ingestNews({ mode: "drill" });
    expect(second.inserted).toBe(0);
    const ev = await db.newsEvent.findFirst({ where: { title: { contains: "Kathmandu" } } });
    expect(ev?.category).toBe("natural_disaster");
    expect(ev?.provenance).toBe("sample");
  });
});

describe("autonomous agent cycle", () => {
  it("loads travellers and trips as risk subjects", async () => {
    const s = await loadSubjects(orgId);
    expect(s.filter((x) => x.type === "traveler").length).toBeGreaterThanOrEqual(24);
    expect(s.some((x) => x.type === "trip")).toBe(true);
  });

  it("senses → thinks → plans → acts → reflects, with a full trace", async () => {
    const r = await runAgentCycle({ trigger: "manual", orgId, newsMode: "drill" });
    expect(r.exposures).toBeGreaterThan(5);
    expect(await db.agentTask.count({ where: { orgId, status: "executed", decidedBy: "agent" } })).toBeGreaterThan(5);
    const steps = await db.agentStep.findMany({ where: { runId: r.runId }, orderBy: { idx: "asc" } });
    expect(steps.map((s) => s.phase)).toEqual(["sense", "think", "plan", "act", "reflect"]);
    const run = await db.agentRun.findUnique({ where: { id: r.runId } });
    expect(run?.status).toBe("succeeded");
  });

  it("acted on the Kathmandu earthquake: check-in sent to the traveller there", async () => {
    const rohan = await db.traveler.findFirst({ where: { orgId, destinationCity: "Kathmandu" } });
    expect(rohan!.exposureScore).toBeGreaterThan(50);
    const checkin = await db.agentTask.findFirst({ where: { subjectId: rohan!.id, kind: "checkin" } });
    expect(checkin?.status).toBe("executed");
    expect(JSON.parse(checkin!.result!).link).toMatch(/\/checkin\//);
    expect(await db.checkinRequest.count({ where: { travelerId: rohan!.id } })).toBeGreaterThan(0);
  });

  it("is idempotent: a second cycle creates no duplicate actions", async () => {
    const r = await runAgentCycle({ trigger: "manual", orgId, ingest: false });
    expect(r.tasksCreated).toBe(0);
  });

  it("keeps binding actions for humans (seat holds proposed at L3)", async () => {
    const holds = await db.agentTask.findMany({ where: { orgId, kind: "hold_rebooking" } });
    expect(holds.length).toBeGreaterThan(0);
    expect(holds.every((h) => h.status === "proposed")).toBe(true);
  });

  it("approval executes a proposed task; rejection is final", async () => {
    const [a, b] = await db.agentTask.findMany({ where: { orgId, status: "proposed" }, take: 2 });
    const done = await decideTask(a.id, "approve", "user-1", orgId);
    expect(done.status).toBe("executed");
    expect(JSON.parse(done.result!).sandboxHold.ref).toMatch(/^SBX-/);
    const rej = await decideTask(b.id, "reject", "user-1", orgId);
    expect(rej.status).toBe("rejected");
    await expect(decideTask(b.id, "approve", "user-1", orgId)).rejects.toThrow();
    await expect(decideTask(a.id, "approve", "user-1", "other-org")).rejects.toThrow(/Forbidden/);
  });

  it("L0 Observe records risk but takes no action", async () => {
    const o = await db.organization.create({ data: { name: "Observer Co", slug: `obs-${Date.now()}`, autonomyLevel: "L0" } });
    await db.traveler.create({ data: { orgId: o.id, name: "Obs Traveller", destinationCity: "Kathmandu", destLat: 27.72, destLng: 85.32, tripStart: new Date(), tripEnd: new Date(Date.now() + 2 * 864e5) } });
    const r = await runAgentCycle({ trigger: "manual", orgId: o.id, ingest: false });
    expect(r.exposures).toBeGreaterThan(0);
    expect(r.executed).toBe(0);
  });

  it("executing an already-executed task is a no-op", async () => {
    const t = await db.agentTask.findFirst({ where: { orgId, status: "executed" } });
    const again = await executeTask(t!.id);
    expect(again.result).toBe(t!.result);
  });
});

describe("observe mode bookkeeping", () => {
  it("L0 tasks are recorded, never placed in the approvals inbox", async () => {
    const o = await db.organization.findFirst({ where: { name: "Observer Co" } });
    expect(await db.agentTask.count({ where: { orgId: o!.id, status: "proposed" } })).toBe(0);
    expect(await db.agentTask.count({ where: { orgId: o!.id, status: "recorded" } })).toBeGreaterThan(0);
  });
});
