import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/logger";

export interface CreateProfileInput {
  userId: string;
  displayName: string;
  emergencyContact?: string;
  preferredDiet?: string;
  accessibilityNeeds?: string;
  medicalNotes?: string;
}

export interface ConsentGrantInput {
  userId: string;
  granteeOrg: string;
  purpose: string;
  accessLevel: "basic_itinerary" | "emergency_medical" | "full_booking";
  durationDays?: number;
}

/**
 * Masks phone number or sensitive emergency string to last 4 digits (e.g. +91-******-4921)
 */
export function maskSensitiveField(val?: string | null): string | null {
  if (!val) return null;
  if (val.length <= 4) return "****";
  return `***-***-${val.slice(-4)}`;
}

/**
 * Retrieves or lazily creates a traveler profile
 */
export async function getOrCreateTravelerProfile(input: CreateProfileInput) {
  let profile = await db.travelerProfile.findUnique({
    where: { userId: input.userId },
    include: { consentGrants: true },
  });

  if (!profile) {
    profile = await db.travelerProfile.create({
      data: {
        userId: input.userId,
        displayName: input.displayName,
        emergencyContact: input.emergencyContact || null,
        preferredDiet: input.preferredDiet || null,
        accessibilityNeeds: input.accessibilityNeeds || null,
        medicalNotes: input.medicalNotes || null,
      },
      include: { consentGrants: true },
    });

    await logAuditEvent({
      actor: "USER",
      actorId: input.userId,
      entity: "TravelerProfile",
      entityId: profile.id,
      event: "profile_created",
      data: { displayName: input.displayName },
    });
  }

  return profile;
}

/**
 * Updates a traveler profile
 */
export async function updateTravelerProfile(userId: string, data: Partial<CreateProfileInput>) {
  const profile = await db.travelerProfile.update({
    where: { userId },
    data: {
      displayName: data.displayName,
      emergencyContact: data.emergencyContact,
      preferredDiet: data.preferredDiet,
      accessibilityNeeds: data.accessibilityNeeds,
      medicalNotes: data.medicalNotes,
    },
    include: { consentGrants: true },
  });

  await logAuditEvent({
    actor: "USER",
    actorId: userId,
    entity: "TravelerProfile",
    entityId: profile.id,
    event: "profile_updated",
    data: { updatedFields: Object.keys(data) },
  });

  return profile;
}

/**
 * Creates an explicit scoped consent grant with expiration
 */
export async function createConsentGrant(input: ConsentGrantInput) {
  const profile = await db.travelerProfile.findUnique({
    where: { userId: input.userId },
  });

  if (!profile) {
    throw new Error(`Profile not found for user: ${input.userId}`);
  }

  const durationDays = input.durationDays || 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const grant = await db.consentGrant.create({
    data: {
      profileId: profile.id,
      granteeOrg: input.granteeOrg,
      purpose: input.purpose,
      accessLevel: input.accessLevel,
      status: "active",
      expiresAt,
    },
  });

  await logAuditEvent({
    actor: "USER",
    actorId: input.userId,
    entity: "ConsentGrant",
    entityId: grant.id,
    event: "consent_granted",
    data: {
      granteeOrg: input.granteeOrg,
      purpose: input.purpose,
      accessLevel: input.accessLevel,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return grant;
}

/**
 * Revokes a consent grant immediately
 */
export async function revokeConsentGrant(userId: string, grantId: string) {
  const profile = await db.travelerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new Error(`Profile not found for user: ${userId}`);
  }

  const existingGrant = await db.consentGrant.findFirst({
    where: { id: grantId, profileId: profile.id },
  });

  if (!existingGrant) {
    throw new Error(`Consent grant not found or not owned by user.`);
  }

  const updated = await db.consentGrant.update({
    where: { id: grantId },
    data: { status: "revoked" },
  });

  await logAuditEvent({
    actor: "USER",
    actorId: userId,
    entity: "ConsentGrant",
    entityId: grantId,
    event: "consent_revoked",
    data: { granteeOrg: existingGrant.granteeOrg },
  });

  return updated;
}

/**
 * Field-level privacy masking resolution according to active consent grants
 */
export async function resolveTravelerIdentityWithConsent(
  userId: string,
  requesterOrg: string,
  requesterRole: string = "external_partner"
) {
  const profile = await db.travelerProfile.findUnique({
    where: { userId },
    include: {
      consentGrants: {
        where: {
          granteeOrg: requesterOrg,
          status: "active",
          expiresAt: { gte: new Date() },
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  // If user is accessing their own profile
  if (requesterRole === "owner" || requesterOrg === "self") {
    return {
      profile,
      accessGranted: true,
      appliedScope: "owner_full",
    };
  }

  const activeGrant = profile.consentGrants[0];

  // No active consent: return heavily masked public view
  if (!activeGrant) {
    return {
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        preferredDiet: profile.preferredDiet || null,
        accessibilityNeeds: null,
        emergencyContact: maskSensitiveField(profile.emergencyContact),
        medicalNotes: null,
      },
      accessGranted: false,
      appliedScope: "no_active_consent_masked",
    };
  }

  // Scoped authorization
  if (activeGrant.accessLevel === "basic_itinerary") {
    return {
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        preferredDiet: profile.preferredDiet,
        accessibilityNeeds: null,
        emergencyContact: null,
        medicalNotes: null,
      },
      accessGranted: true,
      appliedScope: "basic_itinerary",
    };
  }

  if (activeGrant.accessLevel === "emergency_medical") {
    return {
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        preferredDiet: profile.preferredDiet,
        accessibilityNeeds: profile.accessibilityNeeds,
        emergencyContact: profile.emergencyContact, // Authorized emergency access
        medicalNotes: profile.medicalNotes,
      },
      accessGranted: true,
      appliedScope: "emergency_medical",
    };
  }

  // Full booking scope
  return {
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      preferredDiet: profile.preferredDiet,
      accessibilityNeeds: profile.accessibilityNeeds,
      emergencyContact: profile.emergencyContact,
      medicalNotes: profile.medicalNotes,
    },
    accessGranted: true,
    appliedScope: "full_booking",
  };
}
