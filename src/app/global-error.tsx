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
        <html lang="en">
            <body className="antialiased">
                <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950 px-4 transition-colors duration-300">
                    <div className="max-w-md w-full text-center">
                        <div className="mb-8 p-6 inline-block rounded-3xl bg-orange-100 dark:bg-orange-500/10 text-6xl">
                            🛠️
                        </div>
                        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white font-serif">
                            Something went wrong
                        </h1>
                        <p className="mb-8 text-lg text-slate-500 dark:text-slate-400">
                            {error.message || "An unexpected error occurred while planning your journey."}
                        </p>
                        {error.digest && (
                            <div className="mb-8 text-left">
                                <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Error Reference</p>
                                <code className="block text-sm text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl overflow-x-auto">
                                    {error.digest}
                                </code>
                            </div>
                        )}
                        <button
                            onClick={() => reset()}
                            className="w-full rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-1 active:scale-[0.98]"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="mt-4 w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors"
                        >
                            Return to Home Page
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
