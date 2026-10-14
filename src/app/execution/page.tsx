"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { requestWorkflowAction, approveAndExecuteWorkflowAction, getExecutionWorkflowsAction } from "@/actions/execution";

export default function ExecutionWorkspacePage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await getExecutionWorkflowsAction();
      setWorkflows(data);
    } catch (e) {
      console.error("Failed to load workflows:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestWorkflow = async (shouldFail: boolean = false) => {
    setCreating(true);
    try {
      const uniqueKey = `wf-test-${Date.now()}`;
      await requestWorkflowAction({
        tripId: "demo-execution-trip",
        idempotencyKey: uniqueKey,
        actor: "USER",
        actorId: "demo_traveler",
        steps: [
          {
            stepIndex: 1,
            title: "IndiGo 6E Flight Seat Hold (DEL -> GOI)",
            provider: "gds",
            operation: "hold_seat",
            payload: {
              origin: "DEL",
              destination: shouldFail ? "" : "GOI", // Empty origin/dest triggers simulated provider failure
              flightNumber: "6E-204",
              passengerName: "Aditya Verma",
            },
          },
          {
            stepIndex: 2,
            title: "Calangute Beachfront Resort Hold",
            provider: "hotel",
            operation: "hold_room",
            payload: {
              hotelName: "Goa Coastal Palms",
              checkIn: "2026-11-15",
              checkOut: "2026-11-19",
              guestName: "Aditya Verma",
            },
          },
        ],
      });
      await loadWorkflows();
    } catch (e) {
      console.error("Creation failed:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (workflowId: string) => {
    setExecutingId(workflowId);
    try {
      await approveAndExecuteWorkflowAction(workflowId);
      await loadWorkflows();
    } catch (e) {
      console.error("Execution failed:", e);
    } finally {
      setExecutingId(null);
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "succeeded":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300";
      case "awaiting_approval":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300";
      case "executing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 animate-pulse";
      case "compensation_required":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300";
      case "failed":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Cpu className="h-3.5 w-3.5" /> Breakthrough 2: Autonomous Execution Engine
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Governed Execution State Machine
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Durable multi-step travel workflow execution with 10 explicit states, idempotency deduplication, and automatic rollback compensation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleCreateTestWorkflow(false)}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Propose New Sandbox Workflow
            </button>
            <button
              onClick={() => handleCreateTestWorkflow(true)}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Test Failure & Compensation Rollback
            </button>
          </div>
        </div>

        {/* Workflows List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" /> Active Workflow Executions ({workflows.length})
            </h2>
            <button
              onClick={loadWorkflows}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
              <Server className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No active workflows</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;Propose New Sandbox Workflow&quot; above to inspect the 10-state machine, idempotency checks, and provider responses.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                          {wf.idempotencyKey}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getStatusBadge(wf.state)}`}>
                          {wf.state.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block">
                        Actor: {wf.actor} ({wf.actorId || "System"}) • Created: {new Date(wf.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {wf.state === "awaiting_approval" && (
                      <button
                        onClick={() => handleApprove(wf.id)}
                        disabled={executingId === wf.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {executingId === wf.id ? "Executing Steps..." : "Approve & Execute (L2)"}
                      </button>
                    )}
                  </div>

                  {/* Steps Progress */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {wf.steps.map((st: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3.5 space-y-2 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Step #{st.stepIndex}: {st.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              st.status === "succeeded"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : st.status === "compensated"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : st.status === "failed"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {st.status}
                          </span>
                        </div>

                        {st.providerReference && (
                          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            Ref: {st.providerReference} (Sandbox)
                          </div>
                        )}

                        {st.error && (
                          <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
                            Error: {st.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Compensation log if triggered */}
                  {wf.compensationLog && wf.compensationLog.length > 0 && (
                    <div className="rounded-xl bg-purple-50 dark:bg-purple-950/40 p-3.5 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider block">
                        Compensation & Rollback Audit Evidence
                      </span>
                      <ul className="list-disc list-inside text-xs text-purple-800 dark:text-purple-300 space-y-0.5">
                        {wf.compensationLog.map((log: string, lIdx: number) => (
                          <li key={lIdx}>{log}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
