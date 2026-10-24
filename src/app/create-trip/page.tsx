import { Suspense } from "react";
import { TripWizard } from "@/components/trip-wizard";

export default function CreateTripPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>}>
            <TripWizard />
        </Suspense>
    );
}
