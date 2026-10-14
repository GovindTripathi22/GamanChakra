"use server";

import { db } from "@/lib/db";
import { AutonomousExecutionEngine, CreateWorkflowParams } from "@/lib/execution/workflow-engine";

export async function requestWorkflowAction(params: CreateWorkflowParams) {
  return await AutonomousExecutionEngine.requestWorkflow(params);
}

export async function approveAndExecuteWorkflowAction(workflowId: string, userId: string = "user_active") {
  return await AutonomousExecutionEngine.approveAndExecuteWorkflow(workflowId, userId);
}

export async function getExecutionWorkflowsAction(tripId?: string) {
  const workflows = await db.executionWorkflow.findMany({
    where: tripId ? { tripId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return workflows.map((w) => ({
    ...w,
    steps: JSON.parse(w.steps || "[]"),
    compensationLog: JSON.parse(w.compensationLog || "[]"),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));
}
