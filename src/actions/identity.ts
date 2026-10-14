"use server";

import { currentUser } from "@/lib/auth/server";
import {
  getOrCreateTravelerProfile,
  updateTravelerProfile,
  createConsentGrant,
  revokeConsentGrant,
  resolveTravelerIdentityWithConsent,
  CreateProfileInput,
  ConsentGrantInput,
} from "@/lib/identity/graph";

async function resolveEffectiveUserId(): Promise<string> {
  const user = await currentUser();
  if (user?.id) return user.id;
  // Demo traveler fallback for development/sandbox mode
  return "demo_traveler_default";
}

export async function getMyProfileAndGrantsAction() {
  const userId = await resolveEffectiveUserId();
  return await getOrCreateTravelerProfile({
    userId,
    displayName: "Ananya Sharma",
    emergencyContact: "+91-98765-43210",
    preferredDiet: "Vegetarian / Jain",
    accessibilityNeeds: "Ground-floor or elevator access required",
    medicalNotes: "Mild asthma; carries rescue inhaler",
  });
}

export async function saveProfileDetailsAction(data: Partial<CreateProfileInput>) {
  const userId = await resolveEffectiveUserId();
  return await updateTravelerProfile(userId, data);
}

export async function grantConsentAction(params: {
  granteeOrg: string;
  purpose: string;
  accessLevel: "basic_itinerary" | "emergency_medical" | "full_booking";
  durationDays?: number;
}) {
  const userId = await resolveEffectiveUserId();
  return await createConsentGrant({
    userId,
    granteeOrg: params.granteeOrg,
    purpose: params.purpose,
    accessLevel: params.accessLevel,
    durationDays: params.durationDays,
  });
}

export async function revokeConsentAction(grantId: string) {
  const userId = await resolveEffectiveUserId();
  return await revokeConsentGrant(userId, grantId);
}

export async function testMaskedProfileViewAction(requesterOrg: string) {
  const userId = await resolveEffectiveUserId();
  return await resolveTravelerIdentityWithConsent(userId, requesterOrg, "external_partner");
}
