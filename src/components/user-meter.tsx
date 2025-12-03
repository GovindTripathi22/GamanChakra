"use client";

import { useEffect, useState } from "react";
import { getUserStatus } from "@/actions/user-status";
import { Crown, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserMeter() {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [tripsToday, setTripsToday] = useState(0);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await getUserStatus();
                setIsAdmin(status.isAdmin);
                setIsAuthenticated(status.isAuthenticated);
            } catch (error) {
                console.error("Failed to fetch user status", error);
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, []);

    useEffect(() => {
        // Check local storage for usage
        const updateUsage = () => {
            const storedDate = localStorage.getItem("lastTripDate");
            const today = new Date().toDateString();

            if (storedDate !== today) {
                // Reset if new day
                localStorage.setItem("lastTripDate", today);
                localStorage.setItem("tripsToday", "0");
                setTripsToday(0);
            } else {
                const count = parseInt(localStorage.getItem("tripsToday") || "0");
                setTripsToday(count);
            }
        };

        updateUsage();

        // Listen for custom event to update count immediately
        window.addEventListener("tripGenerated", updateUsage);
        return () => window.removeEventListener("tripGenerated", updateUsage);
    }, []);

    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (!isAuthenticated) return null;

    if (isAdmin) {
        return (
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 px-3 py-1.5 border border-yellow-500/30">
                <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Admin Pro</span>
            </div>
        );
    }

    const remaining = Math.max(0, 3 - tripsToday);
    const percentage = (tripsToday / 3) * 100;

    return (
        <div className="flex items-center gap-3 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {remaining > 0 ? `${remaining} trips left` : "Limit reached"}
                </span>
            </div>
            <div className="h-1.5 w-12 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500",
                        remaining === 0 ? "bg-red-500" : "bg-blue-500"
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
