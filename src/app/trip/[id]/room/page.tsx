"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Vote,
  Receipt,
  Share2,
  Plus,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ExternalLink,
  QrCode,
  DollarSign,
  TrendingUp,
  CreditCard,
  IndianRupee,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getGroupRoomAction,
  addMemberAction,
  voteOnPollAction,
  addExpenseAction,
  markSettlementPaidAction,
} from "@/actions/group-room";
import type { GroupRoomState } from "@/types/group";

export default function GroupTripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [room, setRoom] = useState<GroupRoomState | null>(null);
  const [activeTab, setActiveTab] = useState<"polls" | "expenses" | "members">("expenses");
  const [loading, setLoading] = useState(true);

  // New Expense Form State
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePayerId, setExpensePayerId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("food");
  const [showAddExpense, setShowAddExpense] = useState(false);

  // New Member State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberUpi, setNewMemberUpi] = useState("");
  const [newMemberBudget, setNewMemberBudget] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    async function loadRoom() {
      try {
        const data = await getGroupRoomAction(tripId);
        setRoom(data);
        if (data.members.length > 0) {
          setExpensePayerId(data.members[0].id);
        }
      } catch (e) {
        console.error("Failed to load group room", e);
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [tripId]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!room) return;
    const voter = room.members[0]; // Active user
    const poll = room.polls.find((p) => p.id === pollId);
    const selectedOption = poll?.options[optionIndex]?.text || "";
    const updated = await voteOnPollAction(tripId, pollId, voter.id, selectedOption);
    setRoom({ ...updated });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !expenseTitle || !expenseAmount) return;

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updated = await addExpenseAction(
      tripId,
      expenseTitle,
      amount,
      expensePayerId || room.members[0].id,
      expenseCategory
    );

    setRoom({ ...updated });
    setExpenseTitle("");
    setExpenseAmount("");
    setShowAddExpense(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !newMemberName.trim()) return;

    const budget = newMemberBudget ? parseFloat(newMemberBudget) : undefined;
    const updated = await addMemberAction(tripId, newMemberName.trim(), newMemberUpi.trim(), budget);
    setRoom({ ...updated });
    setNewMemberName("");
    setNewMemberUpi("");
    setNewMemberBudget("");
    setShowAddMember(false);
  };

  const handleMarkSettlementPaid = async (settlementId: string) => {
    if (!room) return;
    const updated = await markSettlementPaidAction(tripId, settlementId);
    setRoom({ ...updated });
  };

  const handleShareRoom = () => {
    const shareUrl = window.location.href;
    const text = `Join our Goa Group Trip Room (${room?.roomCode}) on Voyage to vote on activities & split expenses: ${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: room?.title, text, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Room link copied to clipboard! Share it in your travel WhatsApp group.");
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Connecting to Group Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 px-2.5 text-xs font-semibold gap-1"
              onClick={() => router.push(`/trip/${tripId}`)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Itinerary
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {room.title}
                </h1>
                <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 text-xs font-mono font-bold">
                  {room.roomCode}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Shared Group Space • {room.members.length} Travelers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl gap-1.5 h-8 shadow-sm"
              onClick={handleShareRoom}
            >
              <Share2 className="h-3.5 w-3.5" />
              Invite Friends
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "expenses"
                ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Split Expenses ({room.expenses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("polls")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "polls"
                ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Vote className="h-4 w-4" />
            <span>Group Polls ({room.polls.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "members"
                ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Travelers & UPI ({room.members.length})</span>
          </button>
        </div>

        {/* TAB 1: EXPENSE LEDGER & 1-TAP UPI SETTLEMENTS */}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Group Spend</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  ₹{room.totalSpend.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-slate-400">
                  Across {room.expenses.length} shared purchases
                </span>
              </Card>

              <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Average Per Person</span>
                <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">
                  ₹{Math.round(room.totalSpend / room.members.length).toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-slate-400">
                  Even split among {room.members.length} travelers
                </span>
              </Card>

              <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Action</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    Record New Bill
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-orange-500 text-white text-xs font-bold rounded-xl gap-1 h-9"
                  onClick={() => setShowAddExpense(true)}
                >
                  <Plus className="h-4 w-4" /> Add Expense
                </Button>
              </Card>
            </div>

            {/* Member Balances Bar */}
            <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Net Balances (Splitwise Ledger)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {room.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.upiId || "No UPI set"}</div>
                    </div>
                    <div
                      className={`text-sm font-extrabold ${
                        m.balance > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : m.balance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {m.balance > 0 ? `+₹${m.balance}` : m.balance < 0 ? `-₹${Math.abs(m.balance)}` : "Settled"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Min-Cash-Flow Settlements & 1-Tap UPI Deep Links */}
            <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    Optimal Settlements (Min-Cash-Flow)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Smart transaction minimization algorithm. Settle with 1-tap UPI deep links.
                  </p>
                </div>
              </div>

              {room.settlements.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  🎉 All expenses are perfectly even. Zero pending settlements!
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {room.settlements.map((s) => (
                    <div
                      key={s.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        s.status === "settled"
                          ? "bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 opacity-60"
                          : "bg-white dark:bg-slate-900/80 border-orange-200/80 dark:border-orange-900/50 shadow-sm"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {s.fromName} owes {s.toName}
                          </span>
                          <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">
                            ₹{s.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Recipient UPI: <strong className="text-slate-600 dark:text-slate-300">{s.toUpiId || "Manual Cash/UPI"}</strong>
                        </div>
                      </div>

                      {s.status === "settled" ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Settled
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {s.upiUrl ? (
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-sm"
                              onClick={() => window.open(s.upiUrl, "_blank")}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay ₹{s.amount} via UPI
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs font-bold"
                              onClick={() => alert(`Please pay ₹${s.amount} directly to ${s.toName}`)}
                            >
                              Manual Pay
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                            onClick={() => handleMarkSettlementPaid(s.id)}
                          >
                            Mark Paid
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Expenses List */}
            <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Shared Expenses Activity
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {room.expenses.map((exp) => (
                  <div key={exp.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{exp.title}</div>
                      <div className="text-[10px] text-slate-400">
                        Paid by <strong>{exp.paidByName}</strong> • Split equally among {exp.splitAmongCount}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        ₹{exp.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ₹{Math.round(exp.amount / exp.splitAmongCount)} / person
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: GROUP POLLS & VOTING */}
        {activeTab === "polls" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Group Polls</h2>
                <p className="text-xs text-slate-500">Vote on destinations, villas, and activities together.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {room.polls.map((poll) => {
                const totalVotes = poll.options.reduce((acc, o) => acc + o.votesCount, 0);

                return (
                  <Card key={poll.id} className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-orange-600 border-orange-500/30">
                          {poll.category}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{totalVotes} votes</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{poll.question}</h3>
                    </div>

                    <div className="space-y-2.5">
                      {poll.options.map((opt, optIndex) => {
                        const percent = totalVotes > 0 ? Math.round((opt.votesCount / totalVotes) * 100) : 0;
                        const isWinning = opt.text === poll.winningOption;

                        return (
                          <div
                            key={opt.text}
                            onClick={() => handleVote(poll.id, optIndex)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                              isWinning
                                ? "border-orange-500/50 bg-orange-50/20 dark:bg-orange-950/20"
                                : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-200"
                            }`}
                          >
                            <div className="relative z-10 flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {opt.text}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {percent}%
                              </span>
                            </div>

                            {/* Progress bar fill */}
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-orange-500/10 dark:bg-orange-500/20 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {poll.winningOption && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Winning Choice: {poll.winningOption}</span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MEMBERS & UPI REGISTRY */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trip Roster & UPI Registry</h2>
                <p className="text-xs text-slate-500">Every member's payment handle for automatic settlements.</p>
              </div>
              <Button
                size="sm"
                className="bg-orange-500 text-white text-xs font-bold rounded-xl gap-1 h-8"
                onClick={() => setShowAddMember(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add Member
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {room.members.map((m) => (
                <Card key={m.id} className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</span>
                    <Badge variant="outline" className="text-[10px] font-bold capitalize">
                      {m.role}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    <span>{m.upiId || "No UPI linked"}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add Expense Modal Drawer */}
        <AnimatePresence>
          {showAddExpense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Shared Expense</h3>
                <form onSubmit={handleAddExpense} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</label>
                    <Input
                      className="h-9 text-xs"
                      placeholder="e.g. Scuba boat rental, Beach shack dinner"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Amount (₹)</label>
                    <Input
                      type="number"
                      className="h-9 text-xs font-semibold"
                      placeholder="e.g. 4500"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Paid By</label>
                    <Select value={expensePayerId} onValueChange={setExpensePayerId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Payer" />
                      </SelectTrigger>
                      <SelectContent>
                        {room.members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddExpense(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="bg-orange-500 text-white font-bold text-xs">
                      Split Bill
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Member Modal Drawer */}
        <AnimatePresence>
          {showAddMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Travel Friend</h3>
                <form onSubmit={handleAddMember} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</label>
                    <Input
                      className="h-9 text-xs"
                      placeholder="e.g. Siddharth"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">UPI ID (Optional)</label>
                    <Input
                      className="h-9 text-xs font-mono"
                      placeholder="e.g. sid@okhdfcbank"
                      value={newMemberUpi}
                      onChange={(e) => setNewMemberUpi(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Private Blind Budget Cap (₹, Optional)</label>
                    <Input
                      type="number"
                      className="h-9 text-xs"
                      placeholder="e.g. 25000 (kept confidential)"
                      value={newMemberBudget}
                      onChange={(e) => setNewMemberBudget(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddMember(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="bg-orange-500 text-white font-bold text-xs">
                      Add to Roster
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
