/**
 * In-memory fallback store for Agent Runs, Steps, and Tasks.
 * Ensures Mission Control, Autonomous Cycles, Thought Stream, and Approval Inbox
 * function seamlessly even when an external PostgreSQL database is offline or in demo mode.
 */

export interface InMemoryAgentStep {
  id: string;
  runId: string;
  idx: number;
  phase: string;
  thought: string;
  tool: string | null;
  input: string;
  output: string;
  durationMs: number;
  createdAt: string;
}

export interface InMemoryAgentTask {
  id: string;
  runId: string | null;
  orgId: string | null;
  subjectType: string;
  subjectId: string;
  newsEventId: string | null;
  kind: string;
  title: string;
  detail: string;
  payload: string;
  autonomyLevel: string;
  status: string;
  idempotencyKey: string;
  decidedBy: string | null;
  decidedAt: string | null;
  result: string | null;
  createdAt: string;
  event?: any;
}

export interface InMemoryAutomationRule {
  id: string;
  orgId: string | null;
  name: string;
  trigger: string;
  enabled: boolean;
  conditions: any;
  actions: any;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

export interface InMemoryAgentRun {
  id: string;
  orgId: string | null;
  trigger: string;
  goal: string;
  status: string;
  summary: string | null;
  eventsSeen: number;
  actionsTaken: number;
  model: string;
  startedAt: string;
  finishedAt: string | null;
  steps: InMemoryAgentStep[];
  tasks: InMemoryAgentTask[];
}

const DEFAULT_RULES: Omit<InMemoryAutomationRule, "id" | "orgId" | "runCount" | "lastRunAt" | "createdAt">[] = [
  { name: "Earthquake & cyclone duty-of-care", trigger: "news_event", conditions: { categories: ["natural_disaster"], minSeverity: "moderate", minExposure: 25 }, actions: [{ type: "checkin" }, { type: "escalate" }], enabled: true },
  { name: "Flight chaos auto-replan", trigger: "news_event", conditions: { categories: ["transport_disruption", "severe_weather"], minExposure: 30 }, actions: [{ type: "reroute" }, { type: "compensation_claim" }], enabled: true },
  { name: "Strike / bandh day planner", trigger: "news_event", conditions: { categories: ["civil_unrest"], minExposure: 30 }, actions: [{ type: "advisory" }, { type: "reschedule" }], enabled: true },
  { name: "Security incident lockdown", trigger: "news_event", conditions: { categories: ["conflict_security"], minSeverity: "high" }, actions: [{ type: "checkin" }, { type: "escalate" }, { type: "webhook" }], enabled: true },
  { name: "Visa & advisory watch", trigger: "news_event", conditions: { categories: ["policy_advisory"], minExposure: 20 }, actions: [{ type: "advisory" }], enabled: false },
];

const g = globalThis as unknown as {
  __gcAgentRuns?: InMemoryAgentRun[];
  __gcAgentTasks?: InMemoryAgentTask[];
  __gcAutomationRules?: InMemoryAutomationRule[];
  __gcAutonomyLevel?: string;
};

if (!g.__gcAgentRuns) {
  g.__gcAgentRuns = [];
}
if (!g.__gcAgentTasks) {
  g.__gcAgentTasks = [];
}
if (!g.__gcAutomationRules) {
  g.__gcAutomationRules = DEFAULT_RULES.map((r, i) => ({
    id: `rule-demo-${i + 1}`,
    orgId: null,
    name: r.name,
    trigger: r.trigger,
    enabled: r.enabled,
    conditions: r.conditions,
    actions: r.actions,
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
  }));
}
if (!g.__gcAutonomyLevel) {
  g.__gcAutonomyLevel = "L2";
}

export const agentMemoryStore = {
  createRun(data: {
    orgId?: string | null;
    trigger: string;
    goal: string;
    model: string;
  }): InMemoryAgentRun {
    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const run: InMemoryAgentRun = {
      id,
      orgId: data.orgId ?? null,
      trigger: data.trigger,
      goal: data.goal,
      status: "running",
      summary: null,
      eventsSeen: 0,
      actionsTaken: 0,
      model: data.model,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      steps: [],
      tasks: [],
    };
    g.__gcAgentRuns!.unshift(run);
    if (g.__gcAgentRuns!.length > 60) g.__gcAgentRuns!.pop();
    return run;
  },

  updateRun(
    id: string,
    data: Partial<{
      status: string;
      summary: string | null;
      eventsSeen: number;
      actionsTaken: number;
      finishedAt: Date | string | null;
    }>
  ): InMemoryAgentRun | null {
    const run = g.__gcAgentRuns!.find((r) => r.id === id);
    if (!run) return null;
    if (data.status !== undefined) run.status = data.status;
    if (data.summary !== undefined) run.summary = data.summary;
    if (data.eventsSeen !== undefined) run.eventsSeen = data.eventsSeen;
    if (data.actionsTaken !== undefined) run.actionsTaken = data.actionsTaken;
    if (data.finishedAt !== undefined) {
      run.finishedAt =
        data.finishedAt instanceof Date
          ? data.finishedAt.toISOString()
          : data.finishedAt;
    }
    return run;
  },

  getRun(id: string): InMemoryAgentRun | null {
    return g.__gcAgentRuns!.find((r) => r.id === id) ?? null;
  },

  listRuns(orgId?: string | null, limit = 30): InMemoryAgentRun[] {
    return g.__gcAgentRuns!
      .filter((r) => !orgId || r.orgId === orgId || r.orgId === null)
      .slice(0, limit);
  },

  addStep(data: {
    runId: string;
    idx: number;
    phase: string;
    thought: string;
    tool: string | null;
    input: string;
    output: string;
    durationMs: number;
  }): InMemoryAgentStep {
    const step: InMemoryAgentStep = {
      id: `step_${Date.now()}_${data.idx}`,
      runId: data.runId,
      idx: data.idx,
      phase: data.phase,
      thought: data.thought,
      tool: data.tool,
      input: data.input,
      output: data.output,
      durationMs: data.durationMs,
      createdAt: new Date().toISOString(),
    };
    const run = g.__gcAgentRuns!.find((r) => r.id === data.runId);
    if (run) {
      run.steps.push(step);
    }
    return step;
  },

  findTaskByKey(key: string): InMemoryAgentTask | null {
    return g.__gcAgentTasks!.find((t) => t.idempotencyKey === key) ?? null;
  },

  findTaskById(id: string): InMemoryAgentTask | null {
    return g.__gcAgentTasks!.find((t) => t.id === id) ?? null;
  },

  createTask(data: {
    runId?: string | null;
    orgId?: string | null;
    subjectType: string;
    subjectId: string;
    newsEventId?: string | null;
    kind: string;
    title: string;
    detail: string;
    payload: string;
    autonomyLevel: string;
    status: string;
    idempotencyKey: string;
  }): InMemoryAgentTask {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const task: InMemoryAgentTask = {
      id,
      runId: data.runId ?? null,
      orgId: data.orgId ?? null,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      newsEventId: data.newsEventId ?? null,
      kind: data.kind,
      title: data.title,
      detail: data.detail,
      payload: data.payload,
      autonomyLevel: data.autonomyLevel,
      status: data.status,
      idempotencyKey: data.idempotencyKey,
      decidedBy: null,
      decidedAt: null,
      result: null,
      createdAt: new Date().toISOString(),
    };
    g.__gcAgentTasks!.unshift(task);
    if (g.__gcAgentTasks!.length > 200) g.__gcAgentTasks!.pop();

    if (data.runId) {
      const run = g.__gcAgentRuns!.find((r) => r.id === data.runId);
      if (run) run.tasks.push(task);
    }
    return task;
  },

  updateTask(
    id: string,
    data: Partial<{
      status: string;
      decidedBy: string | null;
      decidedAt: string | null;
      result: string | null;
    }>
  ): InMemoryAgentTask | null {
    const task = g.__gcAgentTasks!.find((t) => t.id === id);
    if (!task) return null;
    if (data.status !== undefined) task.status = data.status;
    if (data.decidedBy !== undefined) task.decidedBy = data.decidedBy;
    if (data.decidedAt !== undefined) task.decidedAt = data.decidedAt;
    if (data.result !== undefined) task.result = data.result;
    return task;
  },

  listTasks(orgId?: string | null, status?: string | null, limit = 100): InMemoryAgentTask[] {
    return g.__gcAgentTasks!
      .filter((t) => {
        if (orgId && t.orgId && t.orgId !== orgId) return false;
        if (status && t.status !== status) return false;
        return true;
      })
      .slice(0, limit);
  },

  listRules(orgId?: string | null): InMemoryAutomationRule[] {
    return g.__gcAutomationRules!.filter((r) => !orgId || !r.orgId || r.orgId === orgId);
  },

  createRule(data: {
    orgId?: string | null;
    name: string;
    trigger: string;
    enabled: boolean;
    conditions: any;
    actions: any;
  }): InMemoryAutomationRule {
    const rule: InMemoryAutomationRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orgId: data.orgId ?? null,
      name: data.name,
      trigger: data.trigger,
      enabled: data.enabled,
      conditions: data.conditions,
      actions: data.actions,
      runCount: 0,
      lastRunAt: null,
      createdAt: new Date().toISOString(),
    };
    g.__gcAutomationRules!.push(rule);
    return rule;
  },

  updateRule(id: string, data: Partial<{ enabled: boolean; name: string; runCount: number; lastRunAt: string }>): InMemoryAutomationRule | null {
    const rule = g.__gcAutomationRules!.find((r) => r.id === id);
    if (!rule) return null;
    if (data.enabled !== undefined) rule.enabled = data.enabled;
    if (data.name !== undefined) rule.name = data.name;
    if (data.runCount !== undefined) rule.runCount = data.runCount;
    if (data.lastRunAt !== undefined) rule.lastRunAt = data.lastRunAt;
    return rule;
  },

  deleteRule(id: string): boolean {
    const idx = g.__gcAutomationRules!.findIndex((r) => r.id === id);
    if (idx >= 0) {
      g.__gcAutomationRules!.splice(idx, 1);
      return true;
    }
    return false;
  },

  getRule(id: string): InMemoryAutomationRule | null {
    return g.__gcAutomationRules!.find((r) => r.id === id) ?? null;
  },

  getAutonomyLevel(_orgId?: string | null): string {
    return g.__gcAutonomyLevel ?? "L2";
  },

  setAutonomyLevel(_orgId?: string | null, level = "L2"): string {
    g.__gcAutonomyLevel = level;
    return level;
  },
};
