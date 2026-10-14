"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from "lucide-react";
import {
  getFinancialOverviewAction,
  createLedgerEntryAction,
  reconcileInvoiceAction,
  seedSampleFinancialRecordsAction,
} from "@/actions/financial";

export default function FinancialOSPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  // Reconciliation form
  const [invoiceRef, setInvoiceRef] = useState("INV-INDIGO-2026-991");
  const [bookingRef, setBookingRef] = useState("RES-DEL-GOI-01");
  const [invoicedAmount, setInvoicedAmount] = useState(4200);
  const [reconResult, setReconResult] = useState<any>(null);

  // New entry form
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newType, setNewType] = useState<any>("charge");
  const [newAmount, setNewAmount] = useState(1500);
  const [newSource, setNewSource] = useState("stripe");
  const [newBookingRef, setNewBookingRef] = useState("RES-MAN-HTL-99");

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await getFinancialOverviewAction();
      setData(res);
    } catch (e) {
      console.error("Failed to load financial overview:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedSampleFinancialRecordsAction();
      await loadOverview();
    } catch (e: any) {
      alert(`Seeding failed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    setReconciling(true);
    try {
      const result = await reconcileInvoiceAction({
        externalInvoiceRef: invoiceRef,
        internalBookingRef: bookingRef,
        invoicedAmountINR: Number(invoicedAmount),
      });
      setReconResult(result);
      await loadOverview();
    } catch (e: any) {
      alert(`Reconciliation error: ${e.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLedgerEntryAction({
        bookingRef: newBookingRef,
        type: newType,
        amountINR: Number(newAmount),
        source: newSource,
      });
      setShowNewEntry(false);
      await loadOverview();
    } catch (e: any) {
      alert(`Entry creation failed: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                KLYP Travel Financial OS
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">
                  Breakthrough 6
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Decimal-safe integer paise ledger, immutable booking audit, and supplier invoice reconciliation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition"
            >
              {seeding ? "Seeding..." : "Seed Ledger Data"}
            </button>
            <button
              onClick={loadOverview}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>NET GMV</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              ₹{(data?.metrics?.netGmvINR || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Gross Merchandise</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>COMMISSION & FEES</span>
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-400">
              ₹{(data?.metrics?.totalCommissionsINR || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Platform Revenue</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>TAXES & GST</span>
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-400">
              ₹{(data?.metrics?.totalTaxesINR || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Tax Collected</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>SETTLED TO VENDORS</span>
              <ArrowDownRight className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-400">
              ₹{(data?.metrics?.totalSettlementsINR || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Partner Settlements</div>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>RECONCILIATION RATE</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">
              {data?.metrics?.reconciledRatio || "100%"}
            </div>
            <div className="text-xs text-slate-500 mt-1">Zero-variance matching</div>
          </div>
        </div>

        {/* 2-Section Content: Reconciliation Engine & Ledger Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Invoice Reconciler (Left 4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              Automated Reconciler
            </h2>
            <p className="text-xs text-slate-400">
              Ingest supplier billing records and match against internal booking ledger entries with integer paise precision.
            </p>

            <form onSubmit={handleReconcile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">External Invoice Ref</label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Internal Booking Ref</label>
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Invoiced Amount (₹)</label>
                <input
                  type="number"
                  value={invoicedAmount}
                  onChange={(e) => setInvoicedAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={reconciling}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium transition shadow flex items-center justify-center gap-2"
              >
                {reconciling ? "Reconciling..." : "Reconcile Invoice"}
              </button>
            </form>

            {reconResult && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border text-xs font-mono space-y-1.5 ${
                  reconResult.status === "matched"
                    ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
                    : "bg-rose-950/30 border-rose-800/60 text-rose-300"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>STATUS: {reconResult.status.toUpperCase()}</span>
                  <span>DIFF: {reconResult.discrepancyPaise / 100} ₹</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Expected: ₹{reconResult.expectedPaise / 100} • Invoiced: ₹{reconResult.invoicedPaise / 100}
                </div>
              </motion.div>
            )}

            {/* Recent Reconciliations List */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400">Recent Matches:</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[10px]">
                {data?.reconciliations?.map((r: any) => (
                  <div key={r.id} className="p-2 bg-slate-950/50 border border-slate-800/80 rounded flex justify-between items-center">
                    <div>
                      <div className="text-white font-semibold">{r.externalInvoiceRef}</div>
                      <div className="text-slate-500">{r.internalBookingRef}</div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded ${r.status === "matched" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Table (Right 8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  Itemized Ledger Transactions
                </h3>
                <p className="text-xs text-slate-400">
                  Stored as exact paise integers in database (no floating point errors).
                </p>
              </div>

              <button
                onClick={() => setShowNewEntry(!showNewEntry)}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-xs font-medium transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Ledger Line
              </button>
            </div>

            {showNewEntry && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleCreateEntry}
                className="p-4 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <label className="block text-slate-400 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  >
                    <option value="charge">charge</option>
                    <option value="booking">booking</option>
                    <option value="refund">refund</option>
                    <option value="commission">commission</option>
                    <option value="tax">tax</option>
                    <option value="settlement">settlement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Booking Ref</label>
                  <input
                    type="text"
                    value={newBookingRef}
                    onChange={(e) => setNewBookingRef(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Source</label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                    required
                  />
                </div>
                <div className="col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewEntry(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-emerald-600 text-white rounded font-medium"
                  >
                    Save Line
                  </button>
                </div>
              </motion.form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] font-mono text-slate-400 border-b border-slate-800 bg-slate-950/40">
                  <tr>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">BOOKING REF</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT (₹)</th>
                    <th className="py-2.5 px-3">SOURCE</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3 text-right">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(!data?.entries || data.entries.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No ledger entries found. Click "Seed Ledger Data" to initialize.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-semibold uppercase text-slate-300">
                          {entry.type}
                        </td>
                        <td className="py-2.5 px-3 text-blue-400">
                          {entry.bookingRef || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-white font-bold">
                          ₹{(entry.amountPaise / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {entry.source}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 text-[10px]">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
