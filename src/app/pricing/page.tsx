"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const plans = [
    {
        name: "Free",
        price: "₹0",
        description: "Perfect for planning your first adventure.",
        features: [
            "3 Trip Generations per month",
            "Basic Itineraries",
            "Hotel Recommendations",
            "Public Support",
        ],
        notIncluded: [
            "Unlimited AI Trips",
            "Offline Access",
            "Export to PDF",
            "Exclusive Deals",
        ],
        buttonText: "Get Started",
        popular: false,
    },
    {
        name: "Pro Day Pass",
        price: "₹7",
        period: "/day",
        description: "Unlimited access for 24 hours.",
        features: [
            "Unlimited Trip Generations",
            "Advanced AI Itineraries",
            "Hotel & Flight Deals",
            "Priority Support",
            "Export to PDF",
            "Save Unlimited Trips",
        ],
        notIncluded: [
            "Dedicated Travel Agent",
            "Concierge Service",
        ],
        buttonText: "Get Day Pass",
        popular: true,
    },
];

export default function PricingPage() {
    const router = useRouter();

    const handlePlanClick = (planName: string) => {
        if (planName === "Free") {
            router.push("/create-trip");
        } else if (planName === "Pro") {
            alert("Payment gateway integration coming soon! You can use the Free plan for now.");
        } else {
            alert("Thank you for your interest! Our sales team will contact you shortly.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-20">
            <div className="container mx-auto px-4">
                {/* Beta Disclaimer Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto mb-12 max-w-3xl rounded-xl border border-orange-200 bg-orange-50 p-4 text-center text-orange-800"
                >
                    <p className="font-semibold">
                        🚀 Currently in Beta: All features are FREE for testing!
                    </p>
                    <p className="text-sm opacity-80">
                        The prices below are for future reference only. Enjoy full access while we build the best travel experience for you.
                    </p>
                </motion.div>

                <div className="mb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 inline-block rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-600"
                    >
                        Future Pricing
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-4 font-serif text-4xl font-bold text-slate-900 md:text-5xl"
                    >
                        Simple, Transparent Pricing
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mx-auto max-w-2xl text-lg text-slate-600"
                    >
                        Choose the plan that fits your travel style. Upgrade anytime as your journey expands.
                    </motion.p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (index + 1) }}
                            className={`relative flex flex-col rounded-3xl border p-8 shadow-sm transition-all hover:shadow-xl ${plan.popular
                                ? "border-orange-500 bg-white ring-4 ring-orange-500/10"
                                : "border-slate-200 bg-white"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-sm font-bold text-white shadow-md">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="mb-2 text-xl font-bold text-slate-900">{plan.name}</h3>
                                <p className="mb-6 text-sm text-slate-500">{plan.description}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                                    {plan.period && (
                                        <span className="text-slate-500">{plan.period}</span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-8 flex-1 space-y-4">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                                            <Check className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-sm text-slate-700">{feature}</span>
                                    </div>
                                ))}
                                {plan.notIncluded.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3 opacity-50">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                            <X className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-sm text-slate-500">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => handlePlanClick(plan.name)}
                                className={`w-full py-6 text-lg font-semibold ${plan.popular
                                    ? "bg-orange-500 text-white hover:bg-orange-600"
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                                    }`}
                            >
                                {plan.buttonText}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
