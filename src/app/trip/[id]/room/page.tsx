"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GroupTripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;

  useEffect(() => {
    if (tripId) {
      router.replace(`/trip/${tripId}`);
    }
  }, [tripId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <p className="text-sm text-slate-500">Redirecting to itinerary...</p>
    </div>
  );
}
