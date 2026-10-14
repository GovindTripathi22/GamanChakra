"use server";

import {
  getFinancialLedgerOverview,
  recordLedgerEntry,
  reconcileSupplierInvoice,
  RecordEntryInput,
  inrToPaise,
} from "@/lib/financial/ledger";
import { db } from "@/lib/db";

export async function getFinancialOverviewAction() {
  return await getFinancialLedgerOverview();
}

export async function createLedgerEntryAction(input: RecordEntryInput) {
  return await recordLedgerEntry(input);
}

export async function reconcileInvoiceAction(params: {
  externalInvoiceRef: string;
  internalBookingRef: string;
  invoicedAmountINR: number;
}) {
  return await reconcileSupplierInvoice(params);
}

export async function seedSampleFinancialRecordsAction() {
  const existing = await db.financialLedgerEntry.count();
  if (existing > 0) return { count: existing, message: "Ledger already populated" };

  const samples: RecordEntryInput[] = [
    {
      bookingRef: "RES-DEL-GOI-01",
      type: "booking",
      amountINR: 4200,
      source: "gds_flight_engine",
      providerRef: "6E-204-P1",
      status: "reconciled",
      metadata: { route: "DEL -> GOI", passenger: "Ananya Sharma" },
    },
    {
      bookingRef: "RES-DEL-GOI-01",
      type: "commission",
      amountINR: 210,
      source: "platform_markup",
      status: "reconciled",
      metadata: { rate: "5%" },
    },
    {
      bookingRef: "RES-DEL-GOI-01",
      type: "tax",
      amountINR: 105,
      source: "gst_in_29",
      status: "reconciled",
      metadata: { gstRate: "2.5%" },
    },
    {
      bookingRef: "RES-JAI-HTL-02",
      type: "charge",
      amountINR: 7500,
      source: "stripe_payment_gateway",
      providerRef: "ch_3NwK4829",
      status: "captured",
      metadata: { hotel: "Samode Haveli", nights: 2 },
    },
    {
      bookingRef: "RES-VNS-BOAT-03",
      type: "settlement",
      amountINR: 1500,
      source: "merchant_upi_direct",
      providerRef: "UPI-SETTLE-8812",
      status: "reconciled",
      metadata: { vendor: "Ghat Boatmen Cooperative" },
    },
  ];

  for (const s of samples) {
    await recordLedgerEntry(s);
  }

  // Add a sample reconciliation
  await reconcileSupplierInvoice({
    externalInvoiceRef: "INV-INDIGO-2026-991",
    internalBookingRef: "RES-DEL-GOI-01",
    invoicedAmountINR: 4200,
  });

  return { count: samples.length, message: "Sample ledger seeded successfully" };
}
