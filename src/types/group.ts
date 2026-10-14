export interface GroupMemberData {
  id: string;
  name: string;
  upiId?: string;
  role: "organizer" | "member";
  balance: number; // Net balance (+ gets back, - owes)
}

export interface GroupPollOption {
  text: string;
  votesCount: number;
  voterNames: string[];
}

export interface GroupPollData {
  id: string;
  question: string;
  category: "hotel" | "activity" | "date" | "general";
  status: "open" | "closed";
  options: GroupPollOption[];
  winningOption?: string;
  createdAt: string;
}

export interface GroupExpenseData {
  id: string;
  title: string;
  amount: number;
  paidByName: string;
  paidById: string;
  category: string;
  splitAmongCount: number;
  createdAt: string;
}

export interface GroupSettlementDebt {
  id: string;
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  toUpiId?: string;
  amount: number;
  upiUrl: string;
  status: "pending" | "settled";
}

export interface GroupRoomState {
  roomId: string;
  tripId: string;
  roomCode: string;
  title: string;
  members: GroupMemberData[];
  polls: GroupPollData[];
  expenses: GroupExpenseData[];
  settlements: GroupSettlementDebt[];
  totalSpend: number;
}
