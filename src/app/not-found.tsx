import Link from "next/link";
import { ChakraMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="flex justify-center"><ChakraMark size={56} /></div>
        <h1 className="font-display text-3xl font-semibold mt-5">This route isn't on our map.</h1>
        <p className="gc-muted mt-2">The page may have moved. Ask Chakra (Ctrl/⌘ + J) or pick a destination below.</p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-[var(--gc-brand)] px-4 text-sm font-semibold text-white">Home</Link>
          <Link href="/risk" className="inline-flex h-10 items-center rounded-xl border gc-line px-4 text-sm font-medium">Risk Radar</Link>
          <Link href="/command" className="inline-flex h-10 items-center rounded-xl border gc-line px-4 text-sm font-medium">Mission Control</Link>
        </div>
      </div>
    </main>
  );
}
