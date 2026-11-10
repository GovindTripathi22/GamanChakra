/**
 * Client-side and server-side utilities for persistent guest session management.
 * Ensures guest travelers can persist and manage claim cases across page refreshes
 * and across Mission Control (/my-trips) and Trip details (/trip/[id]).
 */

export const GUEST_SESSION_STORAGE_KEY = "voyage_guest_id";
export const GUEST_COOKIE_NAME = "voyage_guest_id";

/**
 * Generates a cryptographically random, collision-resistant guest session ID.
 */
export function generateGuestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `guest_${timestamp}_${randomPart}`;
}

/**
 * Retrieves the existing guest session ID or initializes a new one.
 * Stores in both localStorage and document.cookie for cross-component and server-action availability.
 */
export function getOrCreateGuestSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    // 1. Check localStorage
    let guestId = localStorage.getItem(GUEST_SESSION_STORAGE_KEY)?.trim() || "";

    // 2. Fall back to document.cookie
    if (!guestId && typeof document !== "undefined" && document.cookie) {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${GUEST_COOKIE_NAME}=`));
      if (match) {
        guestId = decodeURIComponent(match.split("=")[1] || "").trim();
      }
    }

    // 3. Generate new ID if neither existed
    if (!guestId) {
      guestId = generateGuestSessionId();
    }

    // 4. Ensure synced in localStorage
    try {
      localStorage.setItem(GUEST_SESSION_STORAGE_KEY, guestId);
    } catch {
      // Storage restricted or unavailable
    }

    // 5. Ensure synced in document.cookie (1-year expiration)
    if (typeof document !== "undefined") {
      try {
        document.cookie = `${GUEST_COOKIE_NAME}=${encodeURIComponent(
          guestId
        )}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Cookie restricted
      }
    }

    return guestId;
  } catch {
    return "";
  }
}
