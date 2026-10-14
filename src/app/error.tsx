"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ChakraMark } from "@/components/brand";

/** Route-level safety net: any unexpected rendering error shows a calm recovery screen, never a crash. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.warn("[voyage] recovered from route error:", error?.message); }, [error]);
  const dbHint = /no such table|does not exist|P2021|database/i.test(error?.message ?? "");
  return (
    <main className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="flex justify-center"><ChakraMark size={56} /></div>
        <h1 className="font-display text-3xl font-semibold mt-5">We hit a bump on this page.</h1>
        <p className="gc-muted mt-2">{dbHint ? "The database isn't initialised yet. Run `npm run setup` in the project folder, then reload." : "Nothing is lost — the agent keeps running in the background. Try again, or head back to Mission Control."}</p>
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--gc-brand)] px-4 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button>
          <Link href="/" className="inline-flex h-10 items-center rounded-xl border gc-line px-4 text-sm font-medium">Home</Link>
        </div>
        {error?.digest && <p className="mt-4 text-[11px] gc-muted">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
