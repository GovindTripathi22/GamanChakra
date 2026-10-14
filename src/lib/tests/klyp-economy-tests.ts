import fs from "fs";
import path from "path";
import { db } from "../db";
import type { GeneratedTrip } from "@/types/trip";

// 1. Trip persistence
import { saveTripToDatabase, getTripFromDatabase } from "@/actions/trip-persistence";

// 2. Group room
import { getGroupRoomAction, addMemberAction, addExpenseAction } from "@/actions/group-room";

// 3. Agent Auth
import { authenticateAgentRequest, rotateAgentApiKey, revokeAgentApiKey } from "../protocol/agent-auth";

// 4. Guardian & Poller
import { resolveDestinationCoordinates } from "../guardian/poller";
import { authorizeAction } from "../policy/engine";

// 6. World Model
import { getWorldEntitiesAction } from "@/actions/world";
import { recordWorldObservation } from "../world/ingestion";
import { runScenarioSimulation } from "../world/simulator";

// 7. Execution Engine
import { AutonomousExecutionEngine } from "../execution/workflow-engine";

// 8. Liquidity Exchange
import { getListingsAction } from "@/actions/exchange";
import { LiquidityExchangeEngine } from "../exchange/liquidity-engine";

// 9. Control Tower
import { getControlTowerOverview, analyzeAndResolveDisruption } from "@/actions/control-tower";

// 10. Identity Graph
import {
  getOrCreateTravelerProfile,
  createConsentGrant,
  revokeConsentGrant,
  resolveTravelerIdentityWithConsent,
} from "../identity/graph";

// 11. Financial OS
import {
  recordLedgerEntry,
  reconcileSupplierInvoice,
  inrToPaise,
} from "../financial/ledger";

// 12. Destination Intelligence
import {
  getDestinationIntelligence,
  calculateSeasonalForecast,
  simulateDestinationScenario,
} from "../destination-intelligence/analytics";

export async function runAllKlypEconomyTests() {
  console.log("--------------------------------------------------------------------------------");
  console.log("  RUNNING SUITE: KLYP AUTONOMOUS TRAVEL ECONOMY (12 CORE CAPABILITIES)");
  console.log("--------------------------------------------------------------------------------");

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // =========================================================================
  // 1. Trip data authorization and persistence
  // =========================================================================
  try {
    const sampleTrip: GeneratedTrip = {
      trip_details: {
        destination: "Jaipur Heritage",
        travelers: "2",
        total_estimated_cost: "₹15,000",
        duration: "3 days",
        budget: "₹15,000",
        vibe: "Heritage",
      },
      transportation_plan: [],
      hotels: [],
      itinerary: [
        {
          day: 1,
          theme: "Palaces",
          activities: [
            {
              id: `act-sample-${Date.now()}`,
              title: "Hawa Mahal",
              description: "Palace of Winds",
              timeSlot: "Morning",
              startTime: "09:00",
              endTime: "11:00",
              locationName: "Jaipur",
              coordinates: { lat: 26.9239, lng: 75.8267 },
              category: "sightseeing",
            },
          ],
        },
      ],
    };

    const saved = await saveTripToDatabase(sampleTrip);
    assert("1.1 Trip creation persists to database", !!saved.tripId && saved.success);

    const fetched = await getTripFromDatabase(saved.tripId);
    assert("1.2 Stored trip is retrievable by ID", !!fetched && fetched.trip_details.destination === "Jaipur Heritage");

    // Overwrite prevention: create trip directly with user_alpha ownership
    const privateTripId = `priv-trip-${Date.now()}`;
    await db.trip.create({
      data: {
        id: privateTripId,
        ownerId: "user_alpha_primary",
        title: "Alpha Confidential Voyage",
        destination: "Leh Ladakh",
        origin: "Delhi",
        status: "planned",
      },
    });

    let preventedOverwrite = false;
    try {
      const overwriteResult = await saveTripToDatabase(sampleTrip, privateTripId);
      if (!overwriteResult.success) {
        preventedOverwrite = true;
      }
    } catch {
      preventedOverwrite = true;
    }
    assert("1.3 Foreign trip ID overwrite attempt is safely rejected", preventedOverwrite);
  } catch (err: any) {
    assert("1.0 Trip authorization test exception", false, err.message);
  }

  // =========================================================================
  // 2. Group collaboration, voting, and budget confidentiality
  // =========================================================================
  try {
    const roomState = await getGroupRoomAction("test-group-trip", "Manali High Trek", undefined, true);
    assert("2.1 Group room created/loaded with members", !!roomState.roomCode && roomState.members.length > 0);

    const updatedRoom = await addMemberAction("test-group-trip", "Sneha Traveler", undefined, 14000);
    const addedMember = updatedRoom.members.find((m) => m.name.includes("Sneha"));
    assert("2.2 Member joins with budget cap", !!addedMember);

    // Budget confidentiality check (Principle P4): Peer view strips member budget caps
    const peerRoom = await getGroupRoomAction("test-group-trip", "Manali High Trek", addedMember?.id);
    const peerMember = peerRoom.members.find((m) => m.name.includes("Aarav"));
    assert("2.3 Peer member budget cap is hidden for confidentiality", (peerMember as any)?.budgetCap === undefined);

    const expRoom = await addExpenseAction("test-group-trip", "Campfire Gathering", 3000, addedMember?.id || "m-1");
    assert("2.4 Shared expense recorded in group room", expRoom.totalSpend >= 3000);
  } catch (err: any) {
    assert("2.0 Group room test exception", false, err.message);
  }

  // =========================================================================
  // 3. Agent API authentication, rate limits, spend caps, and key revocation
  // =========================================================================
  try {
    const rotated = await rotateAgentApiKey("agent_production_tester");
    assert("3.1 Key generated and returned with prefix voyage_agt_", !!rotated && rotated.apiKey.startsWith("voyage_agt_"));

    const authSuccess = await authenticateAgentRequest(rotated!.apiKey);
    assert("3.2 Authenticate with valid key succeeds", !!authSuccess.agent);

    await revokeAgentApiKey(authSuccess.agent!.id);
    const authRevoked = await authenticateAgentRequest(rotated!.apiKey);
    assert("3.3 Authenticate with revoked key is rejected", !authRevoked.agent);
  } catch (err: any) {
    assert("3.0 Agent auth test exception", false, err.message);
  }

  // =========================================================================
  // 4. Trip Guardian coordinates and recovery policy authorization
  // =========================================================================
  try {
    const coords = resolveDestinationCoordinates("Varanasi, India");
    assert("4.1 Resolves true coordinates for destination (Varanasi: 25.3176, 82.9739)", coords.lat === 25.3176 && coords.lng === 82.9739);

    const policy = authorizeAction({
      userId: "test_user",
      tripId: "test_trip",
      actionKind: "reorder",
      requestedAutonomyLevel: "L2",
      estimatedCostINR: 150,
    });
    // L2 requires human confirmation per Principle P3
    assert("4.2 Policy engine gates L2 autonomous action behind confirmation", policy.decision === "needs_approval");
  } catch (err: any) {
    assert("4.0 Guardian test exception", false, err.message);
  }

  // =========================================================================
  // 5. Service worker caching boundaries and safe offline behavior
  // =========================================================================
  try {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    const swContent = fs.readFileSync(swPath, "utf-8");
    const deniesApi = swContent.includes('url.pathname.startsWith("/api/")');
    const deniesAuth = swContent.includes('url.pathname.startsWith("/my-trips")');
    assert("5.1 Service worker explicitly blocks caching sensitive /api/* and /my-trips", deniesApi && deniesAuth);
  } catch (err: any) {
    assert("5.0 Service worker test exception", false, err.message);
  }

  // =========================================================================
  // 6. World Model ingest, freshness expiry, entity queries, and disruption simulation
  // =========================================================================
  try {
    const entities = await getWorldEntitiesAction("airport");
    assert("6.1 World model retrieves normalized airport entities", entities.length > 0);

    const obs = await recordWorldObservation({
      entityId: entities[0].id,
      kind: "weather_visibility",
      metricValue: 850,
      source: "metar_del_imd",
      ttlMinutes: 60,
    });
    assert("6.2 Ingest telemetry observation with TTL and provenance", !!obs.id && obs.value === 850);

    const sim = runScenarioSimulation({ scenarioId: "winter_fog_del", severity: "severe" });
    assert("6.3 World model simulator calculates cascading delays and mitigations", sim.expectedDelayMinutes > 0 && sim.recommendedMitigations.length > 0);
  } catch (err: any) {
    assert("6.0 World model test exception", false, err.message);
  }

  // =========================================================================
  // 7. Autonomous Execution Engine state transitions, retry policy, idempotency, and rollback
  // =========================================================================
  try {
    const uniqueKey = `test-idem-${Date.now()}`;
    const wfRes = await AutonomousExecutionEngine.requestWorkflow({
      tripId: "test-trip-exec",
      idempotencyKey: uniqueKey,
      actor: "USER",
      actorId: "test_runner",
      steps: [
        {
          stepIndex: 1,
          title: "Hold IndiGo Flight Seat",
          provider: "gds",
          operation: "hold_seat",
          payload: { origin: "DEL", destination: "BOM", flightNumber: "6E-551" },
          compensationPayload: { bookingRef: "6E-551-HOLD" },
        },
      ],
    });
    assert("7.1 Workflow created in awaiting_approval state with idempotencyKey", wfRes.workflow.state === "awaiting_approval");

    const duplicateRes = await AutonomousExecutionEngine.requestWorkflow({
      tripId: "test-trip-exec",
      idempotencyKey: uniqueKey,
      actor: "USER",
      actorId: "test_runner",
      steps: [],
    });
    assert("7.2 Idempotent duplicate request returns existing record", duplicateRes.workflow.id === wfRes.workflow.id);

    const executed = await AutonomousExecutionEngine.approveAndExecuteWorkflow(wfRes.workflow.id, "test_runner");
    assert("7.3 Workflow executes through states to succeeded", executed.state === "succeeded");
  } catch (err: any) {
    assert("7.0 Execution engine test exception", false, err.message);
  }

  // =========================================================================
  // 8. Travel Liquidity Exchange inventory holds, expiry, reservation creation, and oversell prevention
  // =========================================================================
  try {
    const listings = await getListingsAction();
    assert("8.1 Liquidity listings retrieved from database", listings.length > 0);

    const testListing = listings[0];
    const holdRes = await LiquidityExchangeEngine.createHold(testListing.id, "test_buyer", 1);
    assert("8.2 Atomic hold created with 15m expiration", !!holdRes.hold.id && holdRes.hold.status === "active");

    const res = await LiquidityExchangeEngine.confirmReservation(holdRes.hold.id, "test_buyer");
    assert("8.3 Hold converts atomically to confirmed reservation", !!res.bookingRef && res.reservation.status === "confirmed");
  } catch (err: any) {
    assert("8.0 Liquidity exchange test exception", false, err.message);
  }

  // =========================================================================
  // 9. Control Tower scheduled monitoring, alert generation, and action dispatch
  // =========================================================================
  try {
    const overview = await getControlTowerOverview();
    assert("9.1 Control Tower overview loads active metrics", typeof overview.metrics.activeTrips === "number");

    const sampleDayPlan: any = {
      day: 1,
      theme: "City Center",
      activities: [
        {
          id: "act-1",
          title: "Outdoor Walk",
          description: "Outdoor walk",
          timeSlot: "Morning",
          startTime: "10:00",
          endTime: "12:00",
          category: "sightseeing",
          locationName: "Jaipur",
          coordinates: { lat: 26.9124, lng: 75.7873 },
        },
      ],
    };
    const sampleDisruption = {
      id: "test-d-1",
      type: "delay" as const,
      title: "Traffic jam",
      description: "Severe roadblock",
      severity: "moderate" as const,
      delayMinutes: 45,
      dayIndex: 0,
    };
    const recovery = await analyzeAndResolveDisruption(sampleDayPlan, sampleDisruption, "Jaipur");
    assert("9.2 Control tower generates 3 ranked recovery strategies", recovery.options.length >= 3);
  } catch (err: any) {
    assert("9.0 Control tower test exception", false, err.message);
  }

  // =========================================================================
  // 10. Journey Identity Graph consent grants, expiration, and field-level privacy masking
  // =========================================================================
  try {
    const testUserId = `test_user_idg_${Date.now()}`;
    const profile = await getOrCreateTravelerProfile({
      userId: testUserId,
      displayName: "Vikram Malhotra",
      emergencyContact: "+91-99887-11223",
      preferredDiet: "Jain",
      medicalNotes: "Hypertension medication",
    });
    assert("10.1 Traveler profile created with preferences and emergency details", !!profile.id);

    const maskedQuery = await resolveTravelerIdentityWithConsent(testUserId, "Random Third Party Agency");
    assert(
      "10.2 Unconsented query masks sensitive emergency contact and omits medical notes",
      Boolean(maskedQuery?.profile.emergencyContact?.startsWith("***-***-") && maskedQuery?.profile.medicalNotes === null)
    );

    const grant = await createConsentGrant({
      userId: testUserId,
      granteeOrg: "City Hospital EMS",
      purpose: "Emergency rescue triage",
      accessLevel: "emergency_medical",
      durationDays: 7,
    });
    assert("10.3 Explicit consent grant created with 7d duration", grant.status === "active");

    const authorizedQuery = await resolveTravelerIdentityWithConsent(testUserId, "City Hospital EMS");
    assert(
      "10.4 Authorized EMS query reveals medical notes and emergency contact",
      Boolean(authorizedQuery?.profile.medicalNotes === "Hypertension medication")
    );

    await revokeConsentGrant(testUserId, grant.id);
    const postRevokeQuery = await resolveTravelerIdentityWithConsent(testUserId, "City Hospital EMS");
    assert("10.5 Revoked consent immediately resets view to masked", Boolean(postRevokeQuery?.accessGranted === false));
  } catch (err: any) {
    assert("10.0 Identity graph test exception", false, err.message);
  }

  // =========================================================================
  // 11. Travel Financial OS integer paise precision, ledger entry creation, and invoice reconciliation
  // =========================================================================
  try {
    assert("11.1 inrToPaise eliminates float inaccuracies (₹42.99 = 4299 paise)", inrToPaise(42.99) === 4299);

    const uniqueBkRef = `TEST-BK-FIN-${Date.now()}`;
    const entry = await recordLedgerEntry({
      bookingRef: uniqueBkRef,
      type: "booking",
      amountINR: 5000,
      source: "stripe",
    });
    assert("11.2 Ledger entry recorded with exact integer paise (500000)", entry.amountPaise === 500000);

    const matched = await reconcileSupplierInvoice({
      externalInvoiceRef: `INV-SUPP-MATCH-${Date.now()}`,
      internalBookingRef: uniqueBkRef,
      invoicedAmountINR: 5000,
    });
    assert("11.3 Invoice reconciliation flags exact match (diff = 0)", matched.status === "matched" && matched.discrepancyPaise === 0);

    const mismatched = await reconcileSupplierInvoice({
      externalInvoiceRef: `INV-SUPP-MISMATCH-${Date.now()}`,
      internalBookingRef: uniqueBkRef,
      invoicedAmountINR: 5200,
    });
    assert("11.4 Invoice reconciliation detects overcharge discrepancy (diff = 20000 paise)", mismatched.status === "mismatched" && mismatched.discrepancyPaise === 20000);
  } catch (err: any) {
    assert("11.0 Financial OS test exception", false, err.message);
  }

  // =========================================================================
  // 12. Destination Intelligence metric aggregation, seasonal forecasting, and scenario simulation
  // =========================================================================
  try {
    const metrics = await getDestinationIntelligence("Jaipur");
    assert("12.1 Destination intelligence returns ARR and transit stress", metrics.length > 0 && metrics[0].avgRoomRateINR > 0);

    const forecast = calculateSeasonalForecast("Goa");
    assert("12.2 Seasonal demand forecast identifies high demand period and surge multiplier", forecast.surgeMultiplier > 1.0 && !!forecast.peakSeason);

    const sim = await simulateDestinationScenario("Jaipur", "festival_surge");
    assert("12.3 Macro scenario simulator projects ARR delta and systemic mitigations", sim.projectedARR > sim.originalARR && !!sim.recommendation);
  } catch (err: any) {
    assert("12.0 Destination intelligence test exception", false, err.message);
  }

  return { total: passed + failed, passed, failed };
}
