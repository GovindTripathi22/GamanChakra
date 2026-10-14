import {
  GroupMemberData,
  GroupExpenseData,
  GroupSettlementDebt,
} from "@/types/group";

export interface ExpenseInput {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  category: string;
  participantIds: string[];
}

export function generateUpiPaymentUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  note: string = "Voyage Trip Settlement"
): string {
  if (!upiId) return "";
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(note.trim());
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount.toFixed(2)}&cu=INR&tn=${cleanNote}`;
}

/**
 * Min-Cash-Flow Splitwise Algorithm
 * Minimizes the total number of cross-member money transfers.
 */
export function calculateGroupSettlements(
  members: { id: string; name: string; upiId?: string }[],
  expenses: ExpenseInput[]
): {
  memberBalances: Record<string, number>;
  settlements: GroupSettlementDebt[];
} {
  const memberBalances: Record<string, number> = {};

  // Initialize balances to 0
  for (const m of members) {
    memberBalances[m.id] = 0;
  }

  // Calculate net balances
  for (const exp of expenses) {
    const participants = exp.participantIds.length > 0 ? exp.participantIds : members.map((m) => m.id);
    const splitShare = exp.amount / participants.length;

    // Credit the payer
    if (memberBalances[exp.paidById] !== undefined) {
      memberBalances[exp.paidById] += exp.amount;
    }

    // Debit each participant
    for (const pId of participants) {
      if (memberBalances[pId] !== undefined) {
        memberBalances[pId] -= splitShare;
      }
    }
  }

  // Separate debtors and creditors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(memberBalances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: -rounded });
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  }

  const settlements: GroupSettlementDebt[] = [];
  let sIndex = 1;

  // Greedily match highest debtor with highest creditor
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const settleAmount = Math.round(Math.min(debtor.amount, creditor.amount));

    const fromMember = members.find((m) => m.id === debtor.id);
    const toMember = members.find((m) => m.id === creditor.id);

    if (settleAmount > 0 && fromMember && toMember) {
      const upiUrl = toMember.upiId
        ? generateUpiPaymentUrl(toMember.upiId, toMember.name, settleAmount)
        : "";

      settlements.push({
        id: `settle-${sIndex++}`,
        fromMemberId: fromMember.id,
        fromName: fromMember.name,
        toMemberId: toMember.id,
        toName: toMember.name,
        toUpiId: toMember.upiId,
        amount: settleAmount,
        upiUrl,
        status: "pending",
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.5) debtors.shift();
    if (creditor.amount < 0.5) creditors.shift();
  }

  return {
    memberBalances,
    settlements,
  };
}
