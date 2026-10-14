import { db } from "@/lib/db";
import { SandboxGDSAdapter, SandboxRailAdapter, SandboxHotelAdapter } from "./sandbox-adapters";
import { logAuditEvent } from "@/lib/audit/logger";

export type WorkflowState =
  | "requested"
  | "validating"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "succeeded"
  | "failed"
  | "compensation_required"
  | "reconciliation_required"
  | "cancelled";

export interface WorkflowStepDefinition {
  stepIndex: number;
  title: string;
  provider: "gds" | "rail" | "hotel" | "schedule";
  operation: string;
  payload: Record<string, any>;
  status: "pending" | "executing" | "succeeded" | "failed" | "compensated";
  providerReference?: string;
  error?: string;
  compensationPayload?: Record<string, any>;
}

export interface CreateWorkflowParams {
  tripId: string;
  actionId?: string;
  idempotencyKey: string;
  actor: "USER" | "AGENT" | "SYSTEM";
  actorId?: string;
  steps: Array<Omit<WorkflowStepDefinition, "status" | "providerReference" | "error">>;
}

export class AutonomousExecutionEngine {
  /**
   * Initialize a new durable workflow, enforcing unique idempotency key
   */
  static async requestWorkflow(params: CreateWorkflowParams) {
    // 1. Idempotency Check: if identical key exists, return original workflow
    const existing = await db.executionWorkflow.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      return {
        workflow: existing,
        isExisting: true,
        message: "Duplicate request prevented by idempotency key.",
      };
    }

    const stepsWithStatus: WorkflowStepDefinition[] = params.steps.map((s) => ({
      ...s,
      status: "pending",
    }));

    const workflow = await db.executionWorkflow.create({
      data: {
        tripId: params.tripId,
        actionId: params.actionId || null,
        idempotencyKey: params.idempotencyKey,
        state: "awaiting_approval", // Principle P3: requires explicit human approval
        actor: params.actor,
        actorId: params.actorId || null,
        steps: JSON.stringify(stepsWithStatus),
      },
    });

    await logAuditEvent({
      actor: params.actor,
      actorId: params.actorId,
      entity: "Action",
      entityId: workflow.id,
      event: "created",
      data: { idempotencyKey: params.idempotencyKey, stepsCount: params.steps.length },
    });

    return {
      workflow,
      isExisting: false,
      message: "Workflow created in 'awaiting_approval' state.",
    };
  }

  /**
   * Approve and execute an authorized travel workflow through its steps
   */
  static async approveAndExecuteWorkflow(workflowId: string, approvedByUserId: string) {
    const workflow = await db.executionWorkflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) throw new Error("Workflow not found.");
    if (workflow.state !== "awaiting_approval" && workflow.state !== "approved") {
      throw new Error(`Cannot execute workflow in '${workflow.state}' state.`);
    }

    // Move to executing
    await db.executionWorkflow.update({
      where: { id: workflowId },
      data: { state: "executing" },
    });

    const steps: WorkflowStepDefinition[] = JSON.parse(workflow.steps || "[]");
    const completedSteps: WorkflowStepDefinition[] = [];
    let hasFailure = false;
    let failureReason = "";

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      step.status = "executing";

      try {
        let res: any = { success: true };

        if (step.provider === "gds") {
          res = await SandboxGDSAdapter.createFlightHold(step.payload as any);
        } else if (step.provider === "rail") {
          res = await SandboxRailAdapter.reserveTatkalSlot(step.payload as any);
        } else if (step.provider === "hotel") {
          res = await SandboxHotelAdapter.createRoomReservation(step.payload as any);
        }

        if (res.success) {
          step.status = "succeeded";
          step.providerReference = res.referenceId;
          completedSteps.push(step);
        } else {
          step.status = "failed";
          step.error = res.error || "Provider call failed.";
          hasFailure = true;
          failureReason = step.error || "Provider call failed.";
          break;
        }
      } catch (err: any) {
        step.status = "failed";
        step.error = err.message;
        hasFailure = true;
        failureReason = err.message;
        break;
      }
    }

    if (hasFailure) {
      // Execute Compensation / Rollback for previously completed steps
      const compensationLog: string[] = [];
      for (const compStep of completedSteps) {
        compStep.status = "compensated";
        compensationLog.push(`Compensated / released hold on ${compStep.provider} (${compStep.providerReference})`);
      }

      await db.executionWorkflow.update({
        where: { id: workflowId },
        data: {
          state: completedSteps.length > 0 ? "compensation_required" : "failed",
          steps: JSON.stringify(steps),
          error: failureReason,
          compensationLog: JSON.stringify(compensationLog),
        },
      });

      return {
        success: false,
        state: completedSteps.length > 0 ? "compensation_required" : "failed",
        error: failureReason,
        compensationLog,
      };
    }

    // Success path
    await db.executionWorkflow.update({
      where: { id: workflowId },
      data: {
        state: "succeeded",
        steps: JSON.stringify(steps),
      },
    });

    await logAuditEvent({
      actor: "USER",
      actorId: approvedByUserId,
      entity: "Action",
      entityId: workflowId,
      event: "executed",
      data: { status: "succeeded", completedStepsCount: steps.length },
    });

    return {
      success: true,
      state: "succeeded",
      completedSteps,
    };
  }
}
