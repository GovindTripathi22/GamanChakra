"use server";

import { db, isDbAvailable } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit/logger";
import {
  ClaimCase,
  CreateClaimInput,
  UpdateClaimInput,
  ClaimCaseStatus,
} from "@/types/claim";
import {
  generateEvidenceChecklist,
  sanitizePolicyNumber,
} from "@/lib/claims/checklist";
import { buildClaimEmailDraft } from "@/lib/claims/email";
import { generateIncidentTimeline } from "@/lib/claims/timeline";

// Resilient in-memory fallback store for offline development, sandboxes, and Vitest runs
const fallbackClaimsStore = new Map<string, ClaimCase>();
const fallbackTripsStore = new Map<string, { id: string; ownerId: string; destination: string; title: string }>();

/** Exported helper for tests to register test trips in fallback store */
export async function registerTestTripInStore(trip: { id: string; ownerId: string; destination: string; title: string }) {
  fallbackTripsStore.set(trip.id, trip);
  fallbackTripsStore.set(`trip_${trip.id}`, trip);
}

/** Exported helper for tests to clear fallback store */
export async function clearTestClaimsStore() {
  fallbackClaimsStore.clear();
  fallbackTripsStore.clear();
}

/**
 * Resolves current actor ID and whether actor is guest.
 */
async function resolveActor(guestSessionId?: string): Promise<{ ownerId: string; isGuest: boolean }> {
  try {
    const userAuth = await auth();
    if (userAuth?.userId) {
      return { ownerId: userAuth.userId, isGuest: false };
    }
  } catch {
    // Guest or unauthenticated
  }

  if (guestSessionId?.trim()) {
    return { ownerId: guestSessionId.trim(), isGuest: true };
  }

  try {
    const cookieStore = await cookies();
    const guestCookie = cookieStore.get("voyage_guest_id")?.value?.trim();
    if (guestCookie) {
      return { ownerId: guestCookie, isGuest: true };
    }
  } catch {
    // Cookies not available in non-request context
  }

  return { ownerId: "", isGuest: true };
}

/**
 * Checks if the caller owns the specified trip.
 */
async function verifyTripOwnership(
  tripId: string,
  actorId: string
): Promise<{ authorized: boolean; tripOwnerId: string; destination: string; title: string }> {
  if (!actorId || actorId.trim().length === 0) {
    return { authorized: false, tripOwnerId: "", destination: "Destination", title: "Trip Exploration" };
  }

  const cleanId = tripId.replace(/^trip_/, "");

  // 1. Check in-memory store (active in tests / offline)
  const memTrip = fallbackTripsStore.get(cleanId) || fallbackTripsStore.get(tripId);
  if (memTrip) {
    if (memTrip.ownerId === actorId && actorId.length > 0) {
      return { authorized: true, tripOwnerId: memTrip.ownerId, destination: memTrip.destination, title: memTrip.title };
    }
    return { authorized: false, tripOwnerId: memTrip.ownerId, destination: memTrip.destination, title: memTrip.title };
  }

  // 2. Check Database if available
  if (await isDbAvailable()) {
    try {
      const trip = await db.trip.findFirst({
        where: {
          OR: [{ id: cleanId }, { id: tripId }],
        },
        select: { id: true, ownerId: true, destination: true, title: true },
      });

      if (trip) {
        const authorized = trip.ownerId === actorId && actorId.length > 0;
        return { authorized, tripOwnerId: trip.ownerId, destination: trip.destination, title: trip.title };
      }
    } catch (e) {
      console.warn("DB trip lookup warning in claims action:", e);
    }
  }

  // 3. Check existing claims in fallback store to prevent cross-tenant collision
  for (const claim of fallbackClaimsStore.values()) {
    if (claim.tripId === cleanId || claim.tripId === tripId) {
      if (claim.ownerId !== actorId) {
        return { authorized: false, tripOwnerId: claim.ownerId, destination: "Destination", title: "Trip Exploration" };
      }
    }
  }

  // 4. If this is a new guest or client trip without pre-existing records,
  // register it to this actor so foreign users cannot subsequently claim it
  const newTrip = { id: cleanId, ownerId: actorId, destination: "Destination", title: "Trip Exploration" };
  fallbackTripsStore.set(cleanId, newTrip);
  fallbackTripsStore.set(tripId, newTrip);
  return { authorized: true, tripOwnerId: actorId, destination: "Destination", title: "Trip Exploration" };
}

/**
 * Creates a persistent, owner-scoped claim case linked to a trip.
 * Enforces trip ownership and logs audit event.
 */
export async function createClaimCaseAction(
  tripId: string,
  input: CreateClaimInput,
  guestSessionId?: string
): Promise<{ success: boolean; claim?: ClaimCase; error?: string }> {
  try {
    const { ownerId, isGuest } = await resolveActor(guestSessionId);
    if (!ownerId) {
      return { success: false, error: "Unauthorized: Missing user authentication or guest session." };
    }

    const cleanTripId = tripId.replace(/^trip_/, "");
    const ownership = await verifyTripOwnership(cleanTripId, ownerId);
    if (!ownership.authorized) {
      return { success: false, error: "Unauthorized: Cannot create claim for a trip owned by another user." };
    }

    const now = new Date().toISOString();
    const claimId = `claim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedPolicyLast4 = sanitizePolicyNumber(input.policyNumberLast4);

    const checklist =
      input.evidenceChecklist && input.evidenceChecklist.length > 0
        ? input.evidenceChecklist
        : generateEvidenceChecklist(input.incidentType, input.provider);

    const timeline =
      input.incidentTimeline && input.incidentTimeline.length > 0
        ? input.incidentTimeline
        : generateIncidentTimeline({
            incidentType: input.incidentType,
            incidentDate: input.incidentDate,
            provider: input.provider,
            description: input.description,
            destination: ownership.destination,
            isSimulatedDisruption: Boolean(input.isSimulatedDisruption),
          });

    const newClaim: ClaimCase = {
      id: claimId,
      tripId: cleanTripId,
      ownerId,
      incidentType: input.incidentType,
      incidentDate: input.incidentDate,
      provider: input.provider,
      description: input.description,
      isSimulatedDisruption: Boolean(input.isSimulatedDisruption),
      disruptionAlertId: input.disruptionAlertId,
      evidenceChecklist: checklist,
      incidentTimeline: timeline,
      policyDetails: {
        insurerName: input.insurerName || "TATA AIG",
        policyNumberLast4: sanitizedPolicyLast4,
        insurerEmail: input.insurerEmail,
      },
      status: "draft",
      followUpDate: input.followUpDate,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    // Pre-build initial email draft
    newClaim.emailDraft = buildClaimEmailDraft({
      claim: newClaim,
      destination: ownership.destination,
      travelerName: isGuest ? "Guest Traveler" : "Traveler",
    });

    // Save to database if available
    let dbSaved = false;
    if (await isDbAvailable()) {
      try {
        await db.claimCase.create({
          data: {
            id: claimId,
            tripId: cleanTripId,
            ownerId,
            incidentType: newClaim.incidentType,
            incidentDate: newClaim.incidentDate,
            provider: newClaim.provider,
            description: newClaim.description,
            isSimulatedDisruption: newClaim.isSimulatedDisruption,
            disruptionAlertId: newClaim.disruptionAlertId,
            evidenceChecklist: JSON.stringify(newClaim.evidenceChecklist),
            incidentTimeline: JSON.stringify(newClaim.incidentTimeline),
            insurerName: newClaim.policyDetails.insurerName,
            policyNumberLast4: newClaim.policyDetails.policyNumberLast4,
            insurerEmail: newClaim.policyDetails.insurerEmail,
            status: newClaim.status,
            followUpDate: newClaim.followUpDate,
            emailDraft: JSON.stringify(newClaim.emailDraft),
            notes: newClaim.notes,
          },
        });
        dbSaved = true;
      } catch (dbErr) {
        console.warn("DB claim insert failed, saving to fallback store:", dbErr);
      }
    }

    // Always maintain in fallback memory store
    fallbackClaimsStore.set(claimId, newClaim);

    // Audit event log
    await logAuditEvent({
      actor: isGuest ? "USER" : "USER",
      actorId: ownerId,
      entity: "ClaimCase",
      entityId: claimId,
      event: "claim_case_created",
      data: {
        tripId: cleanTripId,
        incidentType: newClaim.incidentType,
        provider: newClaim.provider,
        isSimulatedDisruption: newClaim.isSimulatedDisruption,
        status: newClaim.status,
        dbSaved,
      },
    });

    return { success: true, claim: newClaim };
  } catch (err: any) {
    console.error("Error creating claim case:", err);
    return { success: false, error: err.message || "Failed to create claim case" };
  }
}

/**
 * Retrieves claim cases linked to a trip, restricted strictly to the trip owner.
 */
export async function getTripClaimCasesAction(
  tripId: string,
  guestSessionId?: string
): Promise<{ success: boolean; claims: ClaimCase[]; error?: string }> {
  try {
    const { ownerId } = await resolveActor(guestSessionId);
    if (!ownerId) {
      return { success: false, claims: [], error: "Unauthorized" };
    }

    const cleanTripId = tripId.replace(/^trip_/, "");
    const ownership = await verifyTripOwnership(cleanTripId, ownerId);
    if (!ownership.authorized) {
      return { success: false, claims: [], error: "Unauthorized: Cannot access claims for a trip owned by another user." };
    }

    const claims: ClaimCase[] = [];

    // 1. Fetch from Database if available
    if (await isDbAvailable()) {
      try {
        const dbCases = await db.claimCase.findMany({
          where: { tripId: cleanTripId, ownerId },
          orderBy: { createdAt: "desc" },
        });

        for (const row of dbCases) {
          claims.push({
            id: row.id,
            tripId: row.tripId,
            ownerId: row.ownerId,
            incidentType: row.incidentType as any,
            incidentDate: row.incidentDate,
            provider: row.provider,
            description: row.description || undefined,
            isSimulatedDisruption: row.isSimulatedDisruption,
            disruptionAlertId: row.disruptionAlertId || undefined,
            evidenceChecklist: JSON.parse(row.evidenceChecklist || "[]"),
            incidentTimeline: JSON.parse(row.incidentTimeline || "[]"),
            policyDetails: {
              insurerName: row.insurerName || undefined,
              policyNumberLast4: row.policyNumberLast4 || undefined,
              insurerEmail: row.insurerEmail || undefined,
            },
            status: row.status as ClaimCaseStatus,
            followUpDate: row.followUpDate || undefined,
            emailDraft: row.emailDraft ? JSON.parse(row.emailDraft) : undefined,
            notes: row.notes || undefined,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          });
        }
      } catch (dbErr) {
        console.warn("DB claim query failed in getTripClaimCasesAction:", dbErr);
      }
    }

    // 2. Supplement from fallback store if not present
    for (const item of fallbackClaimsStore.values()) {
      if (item.tripId === cleanTripId && item.ownerId === ownerId) {
        if (!claims.some((c) => c.id === item.id)) {
          claims.push(item);
        }
      }
    }

    return { success: true, claims: claims.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  } catch (err: any) {
    console.error("Error fetching trip claims:", err);
    return { success: false, claims: [], error: err.message || "Failed to fetch claims" };
  }
}

/**
 * Retrieves all claim cases owned by the current traveler across all their trips.
 * Powers the Mission Control Claims Center.
 */
export async function getUserClaimCasesAction(
  guestSessionId?: string
): Promise<{ success: boolean; claims: ClaimCase[]; error?: string }> {
  try {
    const { ownerId } = await resolveActor(guestSessionId);
    if (!ownerId) {
      return { success: true, claims: [] };
    }

    const claims: ClaimCase[] = [];

    // 1. Fetch from Database if available
    if (await isDbAvailable()) {
      try {
        const dbCases = await db.claimCase.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
        });

        for (const row of dbCases) {
          claims.push({
            id: row.id,
            tripId: row.tripId,
            ownerId: row.ownerId,
            incidentType: row.incidentType as any,
            incidentDate: row.incidentDate,
            provider: row.provider,
            description: row.description || undefined,
            isSimulatedDisruption: row.isSimulatedDisruption,
            disruptionAlertId: row.disruptionAlertId || undefined,
            evidenceChecklist: JSON.parse(row.evidenceChecklist || "[]"),
            incidentTimeline: JSON.parse(row.incidentTimeline || "[]"),
            policyDetails: {
              insurerName: row.insurerName || undefined,
              policyNumberLast4: row.policyNumberLast4 || undefined,
              insurerEmail: row.insurerEmail || undefined,
            },
            status: row.status as ClaimCaseStatus,
            followUpDate: row.followUpDate || undefined,
            emailDraft: row.emailDraft ? JSON.parse(row.emailDraft) : undefined,
            notes: row.notes || undefined,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          });
        }
      } catch (dbErr) {
        console.warn("DB claim query failed in getUserClaimCasesAction:", dbErr);
      }
    }

    // 2. Supplement from fallback store
    for (const item of fallbackClaimsStore.values()) {
      if (item.ownerId === ownerId) {
        if (!claims.some((c) => c.id === item.id)) {
          claims.push(item);
        }
      }
    }

    return { success: true, claims: claims.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  } catch (err: any) {
    console.error("Error fetching user claims:", err);
    return { success: false, claims: [], error: err.message || "Failed to fetch user claims" };
  }
}

/**
 * Updates an existing claim case (e.g. updating evidence collected, adding notes, setting follow-up date).
 * Strictly enforces owner authorization.
 */
export async function updateClaimCaseAction(
  claimId: string,
  input: UpdateClaimInput,
  guestSessionId?: string
): Promise<{ success: boolean; claim?: ClaimCase; error?: string }> {
  try {
    const { ownerId } = await resolveActor(guestSessionId);
    if (!ownerId) {
      return { success: false, error: "Unauthorized: Missing user authentication or guest session." };
    }

    // Look up claim
    let existing: ClaimCase | null = fallbackClaimsStore.get(claimId) || null;

    if (!existing && (await isDbAvailable())) {
      try {
        const row = await db.claimCase.findUnique({ where: { id: claimId } });
        if (row) {
          existing = {
            id: row.id,
            tripId: row.tripId,
            ownerId: row.ownerId,
            incidentType: row.incidentType as any,
            incidentDate: row.incidentDate,
            provider: row.provider,
            description: row.description || undefined,
            isSimulatedDisruption: row.isSimulatedDisruption,
            disruptionAlertId: row.disruptionAlertId || undefined,
            evidenceChecklist: JSON.parse(row.evidenceChecklist || "[]"),
            incidentTimeline: JSON.parse(row.incidentTimeline || "[]"),
            policyDetails: {
              insurerName: row.insurerName || undefined,
              policyNumberLast4: row.policyNumberLast4 || undefined,
              insurerEmail: row.insurerEmail || undefined,
            },
            status: row.status as ClaimCaseStatus,
            followUpDate: row.followUpDate || undefined,
            emailDraft: row.emailDraft ? JSON.parse(row.emailDraft) : undefined,
            notes: row.notes || undefined,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          };
        }
      } catch (dbErr) {
        console.warn("DB claim query failed in updateClaimCaseAction:", dbErr);
      }
    }

    if (!existing) {
      return { success: false, error: "Claim case not found." };
    }

    // Verify ownership
    if (existing.ownerId !== ownerId) {
      return { success: false, error: "Unauthorized: Cannot modify a claim owned by another user." };
    }

    const updatedNow = new Date().toISOString();
    const updatedPolicyLast4 =
      input.policyNumberLast4 !== undefined
        ? sanitizePolicyNumber(input.policyNumberLast4)
        : existing.policyDetails.policyNumberLast4;

    const updatedClaim: ClaimCase = {
      ...existing,
      incidentType: input.incidentType ?? existing.incidentType,
      incidentDate: input.incidentDate ?? existing.incidentDate,
      provider: input.provider ?? existing.provider,
      description: input.description !== undefined ? input.description : existing.description,
      policyDetails: {
        insurerName: input.insurerName ?? existing.policyDetails.insurerName,
        policyNumberLast4: updatedPolicyLast4,
        insurerEmail: input.insurerEmail ?? existing.policyDetails.insurerEmail,
      },
      evidenceChecklist: input.evidenceChecklist ?? existing.evidenceChecklist,
      incidentTimeline: input.incidentTimeline ?? existing.incidentTimeline,
      followUpDate: input.followUpDate !== undefined ? input.followUpDate : existing.followUpDate,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      status: input.status ?? existing.status,
      emailDraft: input.emailDraft ?? existing.emailDraft,
      updatedAt: updatedNow,
    };

    // Update in database if available
    if (await isDbAvailable()) {
      try {
        await db.claimCase.update({
          where: { id: claimId },
          data: {
            incidentType: updatedClaim.incidentType,
            incidentDate: updatedClaim.incidentDate,
            provider: updatedClaim.provider,
            description: updatedClaim.description,
            evidenceChecklist: JSON.stringify(updatedClaim.evidenceChecklist),
            incidentTimeline: JSON.stringify(updatedClaim.incidentTimeline),
            insurerName: updatedClaim.policyDetails.insurerName,
            policyNumberLast4: updatedClaim.policyDetails.policyNumberLast4,
            insurerEmail: updatedClaim.policyDetails.insurerEmail,
            followUpDate: updatedClaim.followUpDate,
            notes: updatedClaim.notes,
            status: updatedClaim.status,
            emailDraft: updatedClaim.emailDraft ? JSON.stringify(updatedClaim.emailDraft) : null,
          },
        });
      } catch (dbErr) {
        console.warn("DB claim update failed in updateClaimCaseAction:", dbErr);
      }
    }

    // Always update fallback memory store
    fallbackClaimsStore.set(claimId, updatedClaim);

    // Audit event log
    await logAuditEvent({
      actor: "USER",
      actorId: ownerId,
      entity: "ClaimCase",
      entityId: claimId,
      event: "claim_case_updated",
      data: {
        status: updatedClaim.status,
        followUpDate: updatedClaim.followUpDate,
      },
    });

    return { success: true, claim: updatedClaim };
  } catch (err: any) {
    console.error("Error updating claim case:", err);
    return { success: false, error: err.message || "Failed to update claim case" };
  }
}

/**
 * Confirms that the traveler has manually reviewed and sent the prefilled email.
 * Transitions status to 'sent_by_traveler' and records sent timestamp and follow-up date.
 * Requirement: UI never says 'sent' until traveler confirms.
 */
export async function confirmClaimEmailSentAction(
  claimId: string,
  followUpDate?: string,
  guestSessionId?: string
): Promise<{ success: boolean; claim?: ClaimCase; error?: string }> {
  const defaultFollowUp =
    followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const existingRes = await updateClaimCaseAction(
    claimId,
    {
      status: "sent_by_traveler",
      followUpDate: defaultFollowUp,
    },
    guestSessionId
  );

  if (existingRes.success && existingRes.claim) {
    if (existingRes.claim.emailDraft) {
      existingRes.claim.emailDraft.status = "sent_confirmed";
      existingRes.claim.emailDraft.sentConfirmedAt = new Date().toISOString();
      fallbackClaimsStore.set(claimId, existingRes.claim);

      if (await isDbAvailable()) {
        try {
          await db.claimCase.update({
            where: { id: claimId },
            data: {
              emailDraft: JSON.stringify(existingRes.claim.emailDraft),
              status: "sent_by_traveler",
              followUpDate: defaultFollowUp,
            },
          });
        } catch (dbErr) {
          console.warn("DB claim email draft update warning:", dbErr);
        }
      }
    }

    const { ownerId } = await resolveActor(guestSessionId);
    await logAuditEvent({
      actor: "USER",
      actorId: ownerId,
      entity: "ClaimCase",
      entityId: claimId,
      event: "claim_email_sent_confirmed",
      data: {
        sentConfirmedAt: new Date().toISOString(),
        followUpDate: defaultFollowUp,
      },
    });
  }

  return existingRes;
}

/**
 * Updates external outcome status (e.g. insurer_acknowledged, settled, rejected).
 * Never fabricated; requires explicit traveler record.
 */
export async function updateClaimStatusAction(
  claimId: string,
  newStatus: ClaimCaseStatus,
  notes?: string,
  guestSessionId?: string
): Promise<{ success: boolean; claim?: ClaimCase; error?: string }> {
  return await updateClaimCaseAction(
    claimId,
    {
      status: newStatus,
      notes,
    },
    guestSessionId
  );
}

/**
 * Deletes a claim case.
 */
export async function deleteClaimCaseAction(
  claimId: string,
  guestSessionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ownerId } = await resolveActor(guestSessionId);
    if (!ownerId) {
      return { success: false, error: "Unauthorized" };
    }

    const existingFallback = fallbackClaimsStore.get(claimId);
    let existingDb: any = null;

    if (await isDbAvailable()) {
      try {
        existingDb = await db.claimCase.findUnique({ where: { id: claimId } });
      } catch (dbErr) {
        console.warn("DB claim query failed in deleteClaimCaseAction:", dbErr);
      }
    }

    if (!existingFallback && !existingDb) {
      return { success: false, error: "Claim case not found." };
    }

    const targetOwner = existingFallback?.ownerId || existingDb?.ownerId;
    if (targetOwner !== ownerId) {
      return { success: false, error: "Unauthorized: Cannot delete a claim owned by another user." };
    }

    fallbackClaimsStore.delete(claimId);

    if (existingDb) {
      try {
        await db.claimCase.delete({ where: { id: claimId } });
      } catch (dbErr) {
        console.warn("DB claim delete warning:", dbErr);
      }
    }

    await logAuditEvent({
      actor: "USER",
      actorId: ownerId,
      entity: "ClaimCase",
      entityId: claimId,
      event: "claim_case_deleted",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete claim" };
  }
}
