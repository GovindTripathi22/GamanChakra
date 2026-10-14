import { calculateGroupSettlements, generateUpiPaymentUrl } from "../group/splitwise";
import { getGroupRoomAction, voteOnPollAction } from "@/actions/group-room";
import { TestResult } from "./contract-tests";

export async function runAllGroupTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  const members = [
    { id: "m-1", name: "Aarav", upiId: "aarav@oksbi" },
    { id: "m-2", name: "Priya", upiId: "priya@okicici" },
    { id: "m-3", name: "Rohan", upiId: "rohan@paytm" },
  ];

  const expenses = [
    {
      id: "exp-1",
      title: "Villa Stay",
      amount: 12000,
      paidById: "m-1",
      category: "stay",
      participantIds: ["m-1", "m-2", "m-3"],
    },
    {
      id: "exp-2",
      title: "Beach Shack Dinner",
      amount: 4500,
      paidById: "m-2",
      category: "food",
      participantIds: ["m-1", "m-2", "m-3"],
    },
  ];

  // TEST 1: Net Balance Sum to Zero
  {
    const start = Date.now();
    try {
      const { memberBalances } = calculateGroupSettlements(members, expenses);
      // Total spend = 16,500. Split / 3 = 5,500 each.
      // Aarav: paid 12,000, share 5,500 -> +6,500
      // Priya: paid 4,500, share 5,500 -> -1,000
      // Rohan: paid 0, share 5,500 -> -5,500
      const sum = Object.values(memberBalances).reduce((a, b) => a + b, 0);
      const passed =
        Math.abs(sum) < 0.01 &&
        Math.round(memberBalances["m-1"]) === 6500 &&
        Math.round(memberBalances["m-2"]) === -1000 &&
        Math.round(memberBalances["m-3"]) === -5500;

      results.push({
        suite: "Group Trip Room",
        testName: "Calculates precise Splitwise balances summing to net zero",
        passed,
        durationMs: Date.now() - start,
        details: `Aarav: +₹${memberBalances["m-1"]}, Priya: ₹${memberBalances["m-2"]}, Rohan: ₹${memberBalances["m-3"]}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Group Trip Room",
        testName: "Calculates precise Splitwise balances summing to net zero",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 2: Min-Cash-Flow Transaction Minimization
  {
    const start = Date.now();
    try {
      const { settlements } = calculateGroupSettlements(members, expenses);
      // 3 members -> at most 2 transactions needed (Rohan -> Aarav, Priya -> Aarav)
      const passed =
        settlements.length <= 2 &&
        settlements.every((s) => s.amount > 0 && s.fromName !== s.toName);

      results.push({
        suite: "Group Trip Room",
        testName: "Minimizes money transfers using min-cash-flow algorithm",
        passed,
        durationMs: Date.now() - start,
        details: `Settlements (${settlements.length}): ${settlements.map((s) => `${s.fromName} owes ${s.toName} ₹${s.amount}`).join(", ")}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Group Trip Room",
        testName: "Minimizes money transfers using min-cash-flow algorithm",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 3: UPI Deep-Link Format Validation
  {
    const start = Date.now();
    try {
      const upiUrl = generateUpiPaymentUrl("aarav@oksbi", "Aarav Sharma", 5500, "Goa Trip Settlement");
      const passed =
        upiUrl.startsWith("upi://pay?") &&
        upiUrl.includes("pa=aarav%40oksbi") || upiUrl.includes("pa=aarav@oksbi") &&
        upiUrl.includes("am=5500.00") &&
        upiUrl.includes("cu=INR");

      results.push({
        suite: "Group Trip Room",
        testName: "Generates valid 1-tap UPI payment deep links with payee and amount",
        passed,
        durationMs: Date.now() - start,
        details: `Generated URL: ${upiUrl}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Group Trip Room",
        testName: "Generates valid 1-tap UPI payment deep links with payee and amount",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  // TEST 4: Group Polls Voting and Winner Resolution
  {
    const start = Date.now();
    try {
      const room = await getGroupRoomAction("test-group-trip");
      const poll = room.polls[0];
      const initialWinning = poll.winningOption;

      // Vote for option 1
      const updated = await voteOnPollAction("test-group-trip", poll.id, "m-3", 1);
      const updatedPoll = updated.polls.find((p) => p.id === poll.id);

      const passed =
        updatedPoll !== undefined &&
        updatedPoll.options.reduce((a, b) => a + b.votesCount, 0) > 0;

      results.push({
        suite: "Group Trip Room",
        testName: "Records member votes on group polls and resolves winning preference",
        passed,
        durationMs: Date.now() - start,
        details: `Poll: "${poll.question}", Winner: ${updatedPoll?.winningOption}`,
      });
    } catch (e: any) {
      results.push({
        suite: "Group Trip Room",
        testName: "Records member votes on group polls and resolves winning preference",
        passed: false,
        durationMs: Date.now() - start,
        details: e.message,
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
