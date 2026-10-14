"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PaymentSuccessPage() {
    const router = useRouter();

    useEffect(() => {
        // Fire event to update local user meter immediately if needed
        localStorage.setItem("tripsToday", "0");
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-green-50 dark:bg-slate-950 px-4 transition-colors duration-300">
            <div className="max-w-md w-full text-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mb-8 flex justify-center"
                >
                    <div className="relative">
                        <div className="absolute inset-0 scale-150 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
                        <CheckCircle className="relative h-28 w-28 text-green-500" />
                    </div>
                </motion.div>

                <h1 className="mb-4 text-4xl font-bold text-green-900 dark:text-white font-serif">
                    Payment Successful!
                </h1>

                <div className="mb-10 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-green-100 dark:border-slate-800">
                    <p className="text-lg text-green-800 dark:text-slate-300">
                        You now have <span className="font-bold text-green-600 dark:text-green-400">Unlimited Access</span> for the next 24 hours.
                    </p>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Start planning your dream trips without limits!
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <Button
                        onClick={() => router.push("/create-trip")}
                        className="w-full bg-green-600 hover:bg-green-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xl py-8 rounded-2xl shadow-lg shadow-green-500/20 transition-all font-bold"
                    >
                        Plan a Trip Now
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/")}
                        className="w-full text-green-700 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-slate-800 py-6"
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
