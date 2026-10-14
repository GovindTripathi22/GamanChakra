/**
 * KLYP / Voyage Autonomous Travel Economy Client SDK
 * Official TypeScript SDK for external autonomous agents and partner systems.
 */

export interface KlypClientConfig {
  baseUrl?: string;
  apiKey: string;
}

export interface McpResponse<T = any> {
  jsonrpc: "2.0";
  id?: string | number;
  result?: {
    content?: Array<{
      type: string;
      text?: string;
    }>;
    data?: T;
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class KlypTravelClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: KlypClientConfig) {
    this.baseUrl = (config.baseUrl || "http://localhost:3000").replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async fetchMcp(toolName: string, args: Record<string, any>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/protocol/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `sdk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MCP request failed [${res.status}]: ${errText}`);
    }

    const json: McpResponse = await res.json();
    if (json.error) {
      throw new Error(`MCP Error [${json.error.code}]: ${json.error.message}`);
    }

    // Attempt to parse text JSON payload if present
    const content = json.result?.content?.[0];
    if (content?.type === "text" && content.text) {
      try {
        return JSON.parse(content.text);
      } catch {
        return content.text;
      }
    }

    return json.result;
  }

  /**
   * Retrieves live itinerary with dependency statuses
   */
  async getLiveItinerary(tripId: string) {
    return this.fetchMcp("voyage_get_live_itinerary", { tripId });
  }

  /**
   * Calculates 7-category true cost engine breakdown
   */
  async getTrueCost(params: {
    destination: string;
    durationDays?: number;
    travelers?: number;
    style?: "budget" | "standard" | "comfort";
  }) {
    return this.fetchMcp("voyage_get_true_cost", params);
  }

  /**
   * Analyzes real-time cascading failures and ranks 3 deterministic recovery paths
   */
  async evaluateDisruption(params: {
    destination: string;
    disruptionType: "delay" | "weather" | "closure" | "crowd_spike";
    delayMinutes?: number;
    dayPlan: any;
  }) {
    return this.fetchMcp("voyage_evaluate_disruption", params);
  }

  /**
   * Dispatches permissioned execution action (L1/L2 autonomy with idempotency)
   */
  async executeAction(params: {
    actionKind: "hold" | "book" | "cancel" | "reorder" | "substitute";
    targetEntityId: string;
    idempotencyKey: string;
    payload?: Record<string, any>;
    autonomyLevel?: "L0" | "L1" | "L2";
    estimatedCostINR?: number;
  }) {
    return this.fetchMcp("voyage_execute_action", params);
  }

  /**
   * Retrieves route risk assessment and safety advisories
   */
  async getRouteRisk(origin: string, destination: string) {
    return this.fetchMcp("voyage_get_route_risk", { origin, destination });
  }

  /**
   * Obtains emergency card and hospital contacts
   */
  async getEmergencyCard(destination: string) {
    return this.fetchMcp("voyage_get_emergency_card", { destination });
  }

  /**
   * Feeds verified real-world operational outcomes back to learning loop
   */
  async recordOutcome(params: {
    predictionId: string;
    outcomeType: string;
    predictedValue: number;
    actualValue: number;
    accuracyScore: number;
  }) {
    return this.fetchMcp("voyage_record_outcome", params);
  }
}
