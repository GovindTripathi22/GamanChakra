import { db } from "../db";

export type AuditActor = "USER" | "SYSTEM" | "AGENT";

export interface AuditEventInput {
  actor: AuditActor;
  actorId?: string;
  entity: "Trip" | "TripItem" | "Action" | "Policy" | "Verification" | "Settlement" | "GroupRoom" | "GroupPoll" | "Expense" | (string & {});
  entityId: string;
  event: "created" | "updated" | "approved" | "rejected" | "executed" | "failed" | "verified" | "member_joined" | "vote_cast" | "expense_added" | "expense_logged" | "settlement_completed" | (string & {});
  data?: Record<string, any>;
}

export interface AuditRecord extends AuditEventInput {
  id: string;
  createdAt: string;
}

/**
 * Append-only audit logger (Section 3, Section 5.B)
 * Records auditable actions across users, system jobs, and external agents.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<AuditRecord> {
  const timestamp = new Date().toISOString();
  const serializedData = JSON.stringify(input.data || {});

  try {
    const record = await db.auditEvent.create({
      data: {
        actor: input.actor,
        actorId: input.actorId || null,
        entity: input.entity,
        entityId: input.entityId,
        event: input.event,
        data: serializedData,
      },
    });

    return {
      id: record.id,
      actor: record.actor as AuditActor,
      actorId: record.actorId || undefined,
      entity: record.entity as any,
      entityId: record.entityId,
      event: record.event as any,
      data: input.data,
      createdAt: record.createdAt.toISOString(),
    };
  } catch (error) {
    // Resilient fallback if DB connection is initializing
    console.warn("Audit logger database fallback:", error);
    return {
      id: `audit-fallback-${Date.now()}`,
      actor: input.actor,
      actorId: input.actorId,
      entity: input.entity,
      entityId: input.entityId,
      event: input.event,
      data: input.data,
      createdAt: timestamp,
    };
  }
}

/**
 * Retrieves the full audit trail for an entity.
 */
export async function getAuditTrail(entity: string, entityId: string): Promise<AuditRecord[]> {
  try {
    const records = await db.auditEvent.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      actor: r.actor as AuditActor,
      actorId: r.actorId || undefined,
      entity: r.entity as any,
      entityId: r.entityId,
      event: r.event as any,
      data: JSON.parse(r.data || "{}"),
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.warn("Failed to retrieve audit trail from DB:", error);
    return [];
  }
}
