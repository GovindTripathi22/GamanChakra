import crypto from "crypto";
import { db } from "@/lib/db";

export interface AgentAuthResult {
  authorized: boolean;
  agent?: {
    id: string;
    name: string;
    scopes: string[];
    rateLimit: number;
    spendCap: number;
  };
  error?: string;
}

/**
 * Hash an API key for safe storage and lookup
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

/**
 * Register a new cryptographically secure Agent client with specified scopes and spend cap.
 * Stores only the SHA-256 hash in the database and returns the unhashed secret once.
 */
export async function registerNewAgentClient(
  name: string,
  scopes: string[] = ["trip:read", "cost:calculate", "disruption:evaluate"],
  spendCap: number = 25000
): Promise<{ apiKey: string; keyHash: string; id: string }> {
  const apiKey = `voyage_agt_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(apiKey);

  const client = await db.agentClient.create({
    data: {
      name,
      keyHash,
      scopes: JSON.stringify(scopes),
      rateLimit: 60,
      spendCap,
      isActive: true,
    },
  });

  return { apiKey, keyHash, id: client.id };
}

/**
 * Revoke an existing Agent API key immediately
 */
export async function revokeAgentApiKey(agentId: string): Promise<boolean> {
  try {
    await db.agentClient.update({
      where: { id: agentId },
      data: { isActive: false },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Rotate an existing Agent API key, updating the hash and returning the new plaintext key
 */
export async function rotateAgentApiKey(agentId: string): Promise<{ apiKey: string } | null> {
  try {
    const newApiKey = `voyage_agt_${crypto.randomBytes(24).toString("hex")}`;
    const newKeyHash = hashApiKey(newApiKey);

    await db.agentClient.upsert({
      where: { id: agentId },
      create: {
        id: agentId,
        name: agentId,
        keyHash: newKeyHash,
        scopes: JSON.stringify(["itinerary:read", "action:execute"]),
        isActive: true,
      },
      update: { keyHash: newKeyHash, isActive: true },
    });

    return { apiKey: newApiKey };
  } catch (err) {
    console.error("Failed to rotate agent API key:", err);
    return null;
  }
}

/**
 * Seed or verify the environment-configured primary agent client
 */
export async function ensureDefaultAgentsExist(): Promise<void> {
  const masterKey = process.env.VOYAGE_AGENT_API_KEY || (process.env.NODE_ENV === "production" ? crypto.randomBytes(24).toString("hex") : "voyage_agt_dev_key_local");
  const keyHash = hashApiKey(masterKey);

  try {
    const existing = await db.agentClient.findUnique({
      where: { keyHash },
    });

    if (!existing) {
      await db.agentClient.create({
        data: {
          name: "voyage-primary-autonomous-agent",
          keyHash,
          scopes: JSON.stringify([
            "trip:read",
            "itinerary:verify",
            "cost:calculate",
            "disruption:evaluate",
            "action:execute",
            "action:propose",
            "emergency:read",
            "outcome:record",
            "telemetry:read",
          ]),
          rateLimit: 120,
          spendCap: 100000,
          isActive: true,
        },
      });
    }
  } catch (err) {
    // Graceful handling
  }
}

/**
 * Verify incoming agent credentials from Authorization header or key string.
 * Enforces scope validation and rejects anonymous requests in production.
 */
export async function authenticateAgentRequest(
  authHeaderOrKey: string | null | undefined,
  requiredScope?: string
): Promise<AgentAuthResult> {
  // In production, reject unauthenticated requests
  if (!authHeaderOrKey) {
    if (process.env.NODE_ENV === "production") {
      return {
        authorized: false,
        error: "Unauthorized: Missing Authorization header. Production requires valid Bearer API key.",
      };
    }

    // In local development or testing, permit basic read-only access
    const devScopes = ["trip:read", "itinerary:verify", "cost:calculate", "disruption:evaluate", "emergency:read", "telemetry:read"];
    if (requiredScope && !devScopes.includes(requiredScope)) {
      return {
        authorized: false,
        error: `Unauthorized: Anonymous development access does not grant scope '${requiredScope}'`,
      };
    }

    return {
      authorized: true,
      agent: {
        id: "dev-sandbox-agent",
        name: "dev-sandbox-agent",
        scopes: devScopes,
        rateLimit: 60,
        spendCap: 0,
      },
    };
  }

  const rawKey = authHeaderOrKey.replace(/^Bearer\s+/i, "").trim();
  const hashed = hashApiKey(rawKey);

  try {
    const client = await db.agentClient.findUnique({
      where: { keyHash: hashed },
    });

    if (!client || !client.isActive) {
      return { authorized: false, error: "Invalid or inactive Agent API credentials." };
    }

    const scopes: string[] = JSON.parse(client.scopes || "[]");
    if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes("*")) {
      return {
        authorized: false,
        error: `Forbidden: Agent credentials missing required scope '${requiredScope}'.`,
      };
    }

    return {
      authorized: true,
      agent: {
        id: client.id,
        name: client.name,
        scopes,
        rateLimit: client.rateLimit,
        spendCap: client.spendCap,
      },
    };
  } catch (err: any) {
    return { authorized: false, error: err.message || "Authentication error." };
  }
}
