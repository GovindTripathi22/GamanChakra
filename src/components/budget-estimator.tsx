"use client";

import { motion } from "framer-motion";
import { DollarSign, PieChart, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";

interface BudgetEstimatorProps {
    budgetTier: string;
    duration: number;
    travelers: string;
}

export function BudgetEstimator({
    budgetTier,
    duration,
    travelers,
}: BudgetEstimatorProps) {
    // Base costs per day based on budget tier (INR)
    const getBaseDailyCost = () => {
        // If it's a number (custom budget), use that as the total budget base
        if (!isNaN(Number(budgetTier))) {
            return Number(budgetTier) / duration / getTravelerMultiplier();
        }

        switch (budgetTier.toLowerCase()) {
            case "cheap":
                return 3000;
            case "moderate":
                return 8000;
            case "luxury":
                return 20000;
            default:
                return 5000;
        }
    };

    // Multiplier based on group size
    const getTravelerMultiplier = () => {
        switch (travelers.toLowerCase()) {
            case "just me":
            case "solo":
                return 1;
            case "couple":
            case "2 people":
                return 1.8; // Shared room savings
            case "family":
            case "3 to 5 people":
                return 3; // 2 adults + kids
            case "friends":
            case "5 to 10 people":
                return 4; // Group of 4 assumption
            default:
                return 2;
        }
    };

    const dailyCost = getBaseDailyCost();
    const multiplier = getTravelerMultiplier();

    // If custom budget, totalCost IS the budgetTier
    const totalCost = !isNaN(Number(budgetTier))
        ? Number(budgetTier)
        : dailyCost * duration * multiplier;

    // Breakdown
    const accommodation = Math.round(totalCost * 0.4);
    const food = Math.round(totalCost * 0.25);
    const activities = Math.round(totalCost * 0.2);
    const transport = Math.round(totalCost * 0.15);

    return (
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <Wallet className="h-6 w-6 text-orange-500" />
                <h2 className="text-2xl font-semibold text-slate-900">Estimated Budget</h2>
            </div>

            <div className="mb-8 text-center">
                <p className="text-sm text-slate-500">Total Estimated Cost</p>
                <div className="flex items-center justify-center gap-1 text-4xl font-bold text-orange-500">
                    <span>₹</span>
                    <span>{totalCost.toLocaleString('en-IN')}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    *Estimates for {duration} days, {travelers}
                </p>
            </div>

            <div className="space-y-4">
                <BudgetRow
                    label="Accommodation"
                    amount={accommodation}
                    color="bg-blue-500"
                    percent={40}
                />
                <BudgetRow
                    label="Food & Dining"
                    amount={food}
                    color="bg-green-500"
                    percent={25}
                />
                <BudgetRow
                    label="Activities"
                    amount={activities}
                    color="bg-purple-500"
                    percent={20}
                />
                <BudgetRow
                    label="Transport"
                    amount={transport}
                    color="bg-orange-500"
                    percent={15}
                />
            </div>
        </Card>
    );
}

function BudgetRow({
    label,
    amount,
    color,
    percent,
}: {
    label: string;
    amount: number;
    color: string;
    percent: number;
}) {
    return (
        <div>
            <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-slate-900">₹{amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color}`}
                />
            </div>
        </div>
    );
}
