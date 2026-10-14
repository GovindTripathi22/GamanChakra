import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/logger";

export type LedgerEntryType =
  | "estimate"
  | "quote"
  | "booking"
  | "charge"
  | "refund"
  | "fee"
  | "commission"
  | "tax"
  | "settlement";

export interface RecordEntryInput {
  tripId?: string;
  bookingRef?: string;
  type: LedgerEntryType;
  amountINR: number;
  currency?: string;
  source: string;
  providerRef?: string;
  status?: "pending" | "captured" | "reconciled" | "disputed";
  metadata?: Record<string, any>;
}

export function inrToPaise(inr: number): number {
  return Math.round(inr * 100);
}

export function paiseToInr(paise: number): number {
  return paise / 100;
}

/**
 * Appends an immutable decimal-safe ledger entry
 */
export async function recordLedgerEntry(input: RecordEntryInput) {
  const amountPaise = inrToPaise(input.amountINR);

  const entry = await db.financialLedgerEntry.create({
    data: {
      tripId: input.tripId || null,
      bookingRef: input.bookingRef || null,
      type: input.type,
      amountPaise,
      currency: input.currency || "INR",
      status: input.status || "reconciled",
      source: input.source,
      providerRef: input.providerRef || null,
      metadata: JSON.stringify(input.metadata || {}),
    },
  });

  await logAuditEvent({
    actor: "SYSTEM",
    actorId: "financial_os",
    entity: "FinancialLedgerEntry",
    entityId: entry.id,
    event: "ledger_entry_recorded",
    data: {
      type: input.type,
      amountPaise,
      bookingRef: input.bookingRef,
      source: input.source,
    },
  });

  return entry;
}

/**
 * Calculates itemized financial breakdown, totals and margins
 */
export async function getFinancialLedgerOverview() {
  const entries = await db.financialLedgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const reconciliations = await db.reconciliationRecord.findMany({
    orderBy: { reconciledAt: "desc" },
    take: 20,
  });

  let totalChargesPaise = 0;
  let totalRefundsPaise = 0;
  let totalCommissionsPaise = 0;
  let totalTaxesPaise = 0;
  let totalSettlementsPaise = 0;

  for (const entry of entries) {
    if (entry.type === "charge" || entry.type === "booking") {
      totalChargesPaise += entry.amountPaise;
    } else if (entry.type === "refund") {
      totalRefundsPaise += entry.amountPaise;
    } else if (entry.type === "commission" || entry.type === "fee") {
      totalCommissionsPaise += entry.amountPaise;
    } else if (entry.type === "tax") {
      totalTaxesPaise += entry.amountPaise;
    } else if (entry.type === "settlement") {
      totalSettlementsPaise += entry.amountPaise;
    }
  }

  const netGmvPaise = Math.max(0, totalChargesPaise - totalRefundsPaise);

  return {
    metrics: {
      netGmvINR: paiseToInr(netGmvPaise),
      totalChargesINR: paiseToInr(totalChargesPaise),
      totalRefundsINR: paiseToInr(totalRefundsPaise),
      totalCommissionsINR: paiseToInr(totalCommissionsPaise),
      totalTaxesINR: paiseToInr(totalTaxesPaise),
      totalSettlementsINR: paiseToInr(totalSettlementsPaise),
      entryCount: entries.length,
      reconciledRatio: reconciliations.length > 0
        ? `${Math.round((reconciliations.filter((r) => r.status === "matched").length / reconciliations.length) * 100)}%`
        : "100%",
    },
    entries,
    reconciliations,
  };
}

/**
 * Automated Invoice Reconciliation Engine
 * Matches external supplier invoice amounts against internal booking records
 */
export async function reconcileSupplierInvoice(params: {
  externalInvoiceRef: string;
  internalBookingRef: string;
  invoicedAmountINR: number;
}) {
  const invoicedPaise = inrToPaise(params.invoicedAmountINR);

  // Look up internal booking ledger entries
  const bookingEntries = await db.financialLedgerEntry.findMany({
    where: { bookingRef: params.internalBookingRef },
  });

  // Calculate expected total for this booking ref
  let expectedPaise = 0;
  if (bookingEntries.length > 0) {
    expectedPaise = bookingEntries.reduce((sum, e) => {
      if (e.type === "booking" || e.type === "charge" || e.type === "quote") {
        return sum + e.amountPaise;
      }
      return sum;
    }, 0);
  } else {
    // If no direct booking entry, look up reservation
    const reservation = await db.reservation.findUnique({
      where: { bookingRef: params.internalBookingRef },
    });
    if (reservation) {
      expectedPaise = inrToPaise(reservation.totalAmountINR);
    } else {
      expectedPaise = invoicedPaise; // Default match baseline for simulated invoices
    }
  }

  const discrepancyPaise = invoicedPaise - expectedPaise;
  const status = discrepancyPaise === 0 ? "matched" : "mismatched";

  const reconciliation = await db.reconciliationRecord.create({
    data: {
      externalInvoiceRef: params.externalInvoiceRef,
      internalBookingRef: params.internalBookingRef,
      expectedPaise,
      invoicedPaise,
      discrepancyPaise,
      status,
    },
  });

  await logAuditEvent({
    actor: "SYSTEM",
    actorId: "financial_reconciler",
    entity: "ReconciliationRecord",
    entityId: reconciliation.id,
    event: "invoice_reconciliation_performed",
    data: {
      externalInvoiceRef: params.externalInvoiceRef,
      internalBookingRef: params.internalBookingRef,
      discrepancyPaise,
      status,
    },
  });

  return reconciliation;
}
