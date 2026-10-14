import { runAllContractTests } from "./contract-tests";
import { runAllVerificationTests } from "./verification-tests";
import { runAllCostTests } from "./cost-tests";
import { runAllGuardianTests } from "./guardian-tests";
import { runAllWaitlistTests } from "./waitlist-tests";
import { runAllGroupTests } from "./group-tests";
import { runAllEmergencyTests } from "./emergency-tests";
import { runAllProtocolTests } from "./protocol-tests";
import { runAllKlypEconomyTests } from "./klyp-economy-tests";

export async function runEntirePlatformVerification() {
  console.log("================================================================================");
  console.log("  VOYAGE MASTER VERIFICATION SUITE: RUNNING ALL PHASES 1 THROUGH 8 & KLYP ECONOMY");
  console.log("================================================================================");

  const contract = await runAllContractTests();
  const verification = await runAllVerificationTests();
  const cost = await runAllCostTests();
  const guardian = await runAllGuardianTests();
  const waitlist = await runAllWaitlistTests();
  const group = await runAllGroupTests();
  const emergency = await runAllEmergencyTests();
  const protocol = await runAllProtocolTests();
  const klypEconomy = await runAllKlypEconomyTests();

  const allSuites = [
    { name: "Phase 1: Foundation & Adapters (P1, P2)", ...contract },
    { name: "Phase 2: Itinerary Verification Engine (F1)", ...verification },
    { name: "Phase 3: True Trip Cost Engine (F2)", ...cost },
    { name: "Phase 4: Trip Guardian & Disruption Monitor (F3)", ...guardian },
    { name: "Phase 5: Waitlist Rescue for Indian Railways (F4)", ...waitlist },
    { name: "Phase 6: Group Trip Room & Splitwise (F5)", ...group },
    { name: "Phase 7: Route Risk & Offline Emergency Card (F6)", ...emergency },
    { name: "Phase 8: Agent Protocol & Outcome Learning Engine", ...protocol },
    { name: "Breakthroughs: KLYP Autonomous Travel Economy 12-Suites", ...klypEconomy },
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of allSuites) {
    totalTests += suite.total;
    totalPassed += suite.passed;
    totalFailed += suite.failed;
    const statusIcon = suite.failed === 0 ? "✓ PASS" : "✗ FAIL";
    console.log(`[${statusIcon}] ${suite.name}: ${suite.passed}/${suite.total} passed`);
  }

  console.log("================================================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log("================================================================================");

  return {
    totalTests,
    totalPassed,
    totalFailed,
    allSuites,
  };
}
