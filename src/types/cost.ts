import { FactProvenance } from "@/lib/providers/types";

export type CostCategory =
  | "transport"
  | "stay"
  | "food"
  | "activities"
  | "local_transit"
  | "taxes_fees"
  | "unexpected_buffer";

export interface CostLineItem {
  id: string;
  category: CostCategory;
  title: string;
  amountMin: number;
  amountMax: number;
  status: "confirmed" | "estimated" | "unestimated";
  source: string;
  details?: string;
  isCulpritOverBudget?: boolean;
}

export interface CostBreakdown {
  destination: string;
  durationDays: number;
  style: "budget" | "standard" | "comfort";
  travelersCount: number;
  currency: string;
  lines: CostLineItem[];
  totalMin: number;
  totalMax: number;
  expectedTotal: number;
  unexpectedBufferPercent: number;
  userBudgetCap?: number;
  budgetStatus: "within_budget" | "near_budget" | "exceeds_budget";
  overageAmount?: number;
  overageCulprits: CostLineItem[];
  provenance: FactProvenance;
  lastCalculatedAt: string;
}
