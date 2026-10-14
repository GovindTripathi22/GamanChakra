import { NextResponse } from "next/server";
import { analyzeCascadingImpact, generateHeuristicRecoveries } from "@/lib/disruption-simulator";
import type { DisruptionEvent, DayPlan, GeneratedTrip } from "@/types/trip";
import { authenticateAgentRequest, ensureDefaultAgentsExist } from "@/lib/protocol/agent-auth";
import { recordPredictionOutcome, getAggregatedOutcomeMetrics } from "@/lib/protocol/outcome-learning";
import { calculateTripCost } from "@/lib/cost/engine";
import { getRouteRiskAssessment, getOfflineEmergencyCard } from "@/actions/emergency";
import { getTripFromDatabase } from "@/actions/trip-persistence";
import { FEATURE_FLAGS } from "@/lib/config/flags";
import { db } from "@/lib/db";

// MCP Server Tool Definitions
const MCP_TOOLS = [
  {
    name: "voyage_get_live_itinerary",
    description: "Fetch structured live itinerary with items, status, and dependency chains.",
    inputSchema: {
      type: "object",
      properties: {
        tripId: { type: "string", description: "Trip ID or timestamp identifier" },
      },
      required: ["tripId"],
    },
  },
  {
    name: "voyage_get_true_cost",
    description: "Pure-function cost engine (F2) returning transparent 7-category breakdown in INR with provenance.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Destination city (e.g. Goa, Jaipur, Paris)" },
        durationDays: { type: "number", description: "Number of days (e.g. 4)" },
        travelers: { type: "number", description: "Number of travelers (e.g. 2)" },
        style: { type: "string", enum: ["budget", "standard", "comfort"], description: "Travel style" },
      },
      required: ["destination"],
    },
  },
  {
    name: "voyage_evaluate_disruption",
    description: "Analyze cascading schedule ripple effects (F3) and rank 3 deterministic recovery options.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Destination city" },
        disruptionType: {
          type: "string",
          enum: ["delay", "weather", "closure", "crowd_spike"],
          description: "Nature of disruption",
        },
        delayMinutes: { type: "number", description: "Delay in minutes" },
        dayPlan: { type: "object", description: "Day plan object with scheduled activities" },
      },
      required: ["destination", "disruptionType", "dayPlan"],
    },
  },
  {
    name: "voyage_execute_action",
    description: "Execute permissioned action (Layer 3). Enforces L2 autonomy limit (P3), idempotency, and audit logging.",
    inputSchema: {
      type: "object",
      properties: {
        tripId: { type: "string", description: "Target trip ID" },
        kind: { type: "string", enum: ["resequence", "substitute", "buffer_relax", "refund_claim"], description: "Action type" },
        requestedLevel: { type: "string", enum: ["L0", "L1", "L2", "L3"], description: "Requested autonomy level" },
        idempotencyKey: { type: "string", description: "Unique idempotency UUID" },
        payload: { type: "object", description: "Action parameters" },
      },
      required: ["tripId", "kind", "idempotencyKey"],
    },
  },
  {
    name: "voyage_get_emergency_card",
    description: "Retrieve offline emergency directory (F6) with verified 24x7 hospital, police, and local phrases.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Destination city" },
        travelMonth: { type: "number", description: "Month of travel (1-12)" },
      },
      required: ["destination"],
    },
  },
  {
    name: "voyage_record_outcome",
    description: "Record observed ground-truth outcome (Layer 3 Outcome Learning) to update prediction calibration.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["verification", "cost", "delay", "waitlist", "recovery"], description: "Domain type" },
        subjectRef: { type: "string", description: "Subject identifier (e.g. flight-6E204)" },
        features: { type: "object", description: "Input features at time of prediction" },
        predicted: { type: "object", description: "Values that were predicted" },
        actual: { type: "object", description: "Observed ground truth values" },
      },
      required: ["kind", "subjectRef", "predicted", "actual"],
    },
  },
  {
    name: "voyage_get_telemetry_metrics",
    description: "Fetch aggregated accuracy telemetry metrics across all prediction outcomes.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function GET() {
  await ensureDefaultAgentsExist();

  return NextResponse.json({
    name: "voyage-mcp-server",
    version: "2.0.0",
    protocolVersion: "2024-11-05",
    description: "Voyage Autonomous Execution Layer & Control Tower Agent MCP Endpoint",
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    autonomyPolicy: {
      maxLevel: FEATURE_FLAGS.MAX_ALLOWED_AUTONOMY_LEVEL,
      l3AutoActEnabled: FEATURE_FLAGS.AUTONOMY_L3_ENABLED,
      rule: "Principle P3: Server hard-disables autonomous L3 execution. All modifications require L2 one-tap approval.",
    },
    tools: MCP_TOOLS,
  });
}

export async function POST(req: Request) {
  try {
    await ensureDefaultAgentsExist();

    const authHeader = req.headers.get("Authorization");
    const auth = await authenticateAgentRequest(authHeader);

    if (!auth.authorized) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32001,
            message: `Unauthorized Agent: ${auth.error}`,
          },
        },
        { status: 401 }
      );
    }

    let body: any;
    try { body = await req.json(); } catch { body = null; }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: body must be a JSON-RPC object" } }, { status: 400 });
    }
    const method = body.method || (body.tool ? "tools/call" : "tools/list");

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? 1,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === "tools/call") {
      const toolName = body.params?.name || body.tool;
      const args = body.params?.arguments || body.args || {};

      const TOOL_SCOPE_MAP: Record<string, string> = {
        voyage_get_live_itinerary: "trip:read",
        voyage_get_true_cost: "cost:calculate",
        voyage_evaluate_disruption: "disruption:evaluate",
        voyage_execute_action: "action:execute",
        voyage_get_emergency_card: "emergency:read",
        voyage_record_outcome: "outcome:record",
        voyage_get_telemetry_metrics: "telemetry:read",
      };

      const requiredScope = TOOL_SCOPE_MAP[toolName];
      if (requiredScope && auth.agent && !auth.agent.scopes.includes(requiredScope) && !auth.agent.scopes.includes("*")) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: body.id ?? 1,
            error: {
              code: -32003,
              message: `Forbidden: Agent lacks required scope '${requiredScope}' for tool '${toolName}'.`,
            },
          },
          { status: 403 }
        );
      }

      switch (toolName) {
        case "voyage_get_live_itinerary": {
          const tripId = args.tripId;
          if (!tripId) {
            return NextResponse.json(
              {
                jsonrpc: "2.0",
                id: body.id ?? 1,
                error: { code: -32602, message: "Missing required parameter 'tripId'." },
              },
              { status: 400 }
            );
          }

          const trip = await getTripFromDatabase(tripId);
          if (!trip) {
            return NextResponse.json(
              {
                jsonrpc: "2.0",
                id: body.id ?? 1,
                error: { code: -32004, message: `Trip '${tripId}' not found.` },
              },
              { status: 404 }
            );
          }

          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(trip, null, 2),
                },
              ],
            },
          });
        }

        case "voyage_get_true_cost": {
          const destination = args.destination || "Goa";
          const duration = Number(args.durationDays || 4);
          const travelers = Number(args.travelers || 2);
          const style = (args.style as any) || "standard";

          const cost = calculateTripCost({
            trip_details: {
              destination,
              duration: `${duration} days`,
              travelers: `${travelers} travelers`,
              budget: style,
              vibe: "sightseeing",
            },
            itinerary: [],
          } as unknown as GeneratedTrip);

          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(cost, null, 2),
                },
              ],
            },
          });
        }

        case "voyage_evaluate_disruption": {
          if (!args.dayPlan || !Array.isArray(args.dayPlan.activities)) {
            return NextResponse.json({ jsonrpc: "2.0", id: body.id ?? 1, error: { code: -32602, message: "Invalid params: dayPlan with an activities array is required" } }, { status: 400 });
          }
          const disruption: DisruptionEvent = {
            id: `mcp-disrupt-${Date.now()}`,
            type: args.disruptionType || "delay",
            title: `Agent Disruption Evaluation (${args.disruptionType})`,
            description: `Disruption evaluated with ${args.delayMinutes || 60}m delay`,
            severity: (args.delayMinutes || 60) > 90 ? "critical" : "moderate",
            delayMinutes: args.delayMinutes || 60,
            dayIndex: args.dayPlan?.day || 1,
          };

          const dayPlan: DayPlan = args.dayPlan;
          const impact = analyzeCascadingImpact(dayPlan, disruption);
          const options = generateHeuristicRecoveries(dayPlan, disruption, args.destination || "Destination");

          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      disruption,
                      impactSummary: impact.impactSummary,
                      cascadingFailures: impact.cascadingFailures,
                      recoveryOptions: options,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "voyage_execute_action": {
          // Principle P3: Conservative Autonomy Ladder Check
          let appliedLevel = args.requestedLevel || "L2";
          let downgraded = false;

          if (appliedLevel === "L3" && !FEATURE_FLAGS.AUTONOMY_L3_ENABLED) {
            appliedLevel = "L2";
            downgraded = true;
          }

          const idempotencyKey = args.idempotencyKey || `idem-${Date.now()}`;
          const tripId = args.tripId || "demo-trip";

          // Check if action with same idempotency key already exists
          let existingAction = null;
          try {
            existingAction = await db.action.findUnique({
              where: { idempotencyKey },
            });
          } catch (e) {}

          if (existingAction) {
            return NextResponse.json({
              jsonrpc: "2.0",
              id: body.id ?? 1,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        status: "idempotent_duplicate_prevented",
                        actionId: existingAction.id,
                        autonomyLevel: existingAction.autonomyLevel,
                        actionStatus: existingAction.status,
                        message: "Action already registered with this idempotency key",
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
            });
          }

          // Register action in DB (status: proposed if L2, requires user approval)
          let actionId = `act-${Date.now()}`;
          try {
            // Verify if trip exists first
            const tripExists = await db.trip.findUnique({ where: { id: tripId } });
            if (tripExists) {
              const created = await db.action.create({
                data: {
                  tripId,
                  kind: args.kind,
                  payload: JSON.stringify(args.payload || {}),
                  autonomyLevel: appliedLevel,
                  status: appliedLevel === "L2" ? "proposed" : "succeeded",
                  idempotencyKey,
                },
              });
              actionId = created.id;
            }

            // Append-only audit log
            await db.auditEvent.create({
              data: {
                actor: "AGENT",
                actorId: auth.agent?.name || "mcp-agent",
                entity: "Action",
                entityId: actionId,
                event: appliedLevel === "L2" ? "action_proposed" : "action_executed",
                data: JSON.stringify({
                  kind: args.kind,
                  downgradedFromL3: downgraded,
                  idempotencyKey,
                }),
              },
            });
          } catch (e) {}

          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      actionId,
                      status: appliedLevel === "L2" ? "proposed_awaiting_traveler_approval" : "executed",
                      autonomyLevel: appliedLevel,
                      downgradedFromL3: downgraded,
                      governanceRule: downgraded
                        ? "L3 auto-act is hard-disabled server-side (P3). Action downgraded to L2 awaiting one-tap human approval."
                        : "Action registered under L2 autonomy protocol.",
                      idempotencyKey,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case "voyage_get_emergency_card": {
          const destination = args.destination || "Goa";
          const [risk, card] = await Promise.all([
            getRouteRiskAssessment(destination, args.travelMonth),
            getOfflineEmergencyCard("mcp-query", destination),
          ]);

          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ risk, card }, null, 2),
                },
              ],
            },
          });
        }

        case "voyage_record_outcome": {
          const result = await recordPredictionOutcome({
            kind: args.kind,
            subjectRef: args.subjectRef,
            features: args.features || {},
            predicted: args.predicted || {},
            actual: args.actual || {},
            actor: "AGENT",
            actorId: auth.agent?.name,
          });

          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            },
          });
        }

        case "voyage_get_telemetry_metrics": {
          const metrics = await getAggregatedOutcomeMetrics();
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id ?? 1,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(metrics, null, 2),
                },
              ],
            },
          });
        }

        default:
          return NextResponse.json(
            {
              jsonrpc: "2.0",
              id: body.id ?? 1,
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`,
              },
            },
            { status: 404 }
          );
      }
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: body.id ?? 1,
        error: {
          code: -32600,
          message: "Invalid Request: unsupported method",
        },
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32603,
          message: process.env.NODE_ENV === "production" ? "Internal error" : (err?.message || "Internal error"),
        },
      },
      { status: 500 }
    );
  }
}
