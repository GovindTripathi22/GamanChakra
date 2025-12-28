"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
    const router = useRouter();

    useEffect(() => {
        // Fire event to update local user meter immediately if needed, 
        // though Clerk metadata update might take a second to propagate.
        localStorage.setItem("tripsToday", "0"); // Reset local counter as a fallback/bonus
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-green-50 px-4">
            <div className="max-w-md text-center">
                <div className="mb-6 flex justify-center">
                    <CheckCircle className="h-24 w-24 text-green-500 animate-bounce" />
                </div>
                <h1 className="mb-4 text-3xl font-bold text-green-900">
                    Payment Successful!
                </h1>
                <p className="mb-8 text-green-700">
                    You now have <b>Unlimited Access</b> for the next 24 hours.
                    Start planning your dream trips without limits!
                </p>
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => router.push("/create-trip")}
                        className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                    >
                        Plan a Trip Now
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/")}
                        className="w-full border-green-200 text-green-700 hover:bg-green-100"
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
