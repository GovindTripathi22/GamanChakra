"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMeter } from "@/components/user-meter";

export function Header() {
    const { isSignedIn } = useUser();

    return (
        <header className="sticky top-0 z-50 w-full bg-white py-4">
            <div className="container mx-auto flex items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Voyage Logo" className="h-10 w-10 object-contain" />
                    <span className="font-sans text-xl font-bold text-slate-900">
                        Voyage
                    </span>
                </Link>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-8 text-slate-600 font-medium">
                    <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
                    <Link href="/my-trips" className="hover:text-orange-500 transition-colors">My Trips</Link>
                    <Link href="/pricing" className="hover:text-orange-500 transition-colors">Pricing</Link>
                    <Link href="/contact" className="hover:text-orange-500 transition-colors">Contact us</Link>
                </nav>

                {/* Auth / CTA */}
                <div className="flex items-center gap-4">
                    {isSignedIn ? (
                        <>
                            <UserMeter />
                            <UserButton />
                        </>
                    ) : (
                        <Link href="/sign-in">
                            <Button className="bg-orange-500 text-white hover:bg-orange-600 rounded-lg px-6 font-medium">
                                Get Started
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}


