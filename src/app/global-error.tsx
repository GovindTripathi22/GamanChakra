"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global error:", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex min-h-screen items-center justify-center bg-white px-4">
                    <div className="max-w-md text-center">
                        <div className="mb-6 text-6xl">🔧</div>
                        <h1 className="mb-4 text-3xl font-bold text-slate-900">
                            Something went wrong
                        </h1>
                        <p className="mb-6 text-slate-500">
                            {error.message || "An unexpected error occurred."}
                        </p>
                        {error.digest && (
                            <p className="mb-6 text-xs text-slate-400 font-mono bg-slate-100 p-2 rounded">
                                Error ID: {error.digest}
                            </p>
                        )}
                        <button
                            onClick={() => reset()}
                            className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
