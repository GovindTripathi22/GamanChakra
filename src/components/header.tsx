"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserMeter } from "@/components/user-meter";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/my-trips", label: "My Trips" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact us" },
];

export function Header() {
    const { isSignedIn } = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full">
            <div className="mx-4 mt-4">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mx-auto max-w-7xl rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/50 px-4 py-3"
                >
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <motion.img
                                src="/logo.svg"
                                alt="Voyage Logo"
                                className="h-10 w-10 object-contain"
                                whileHover={{ rotate: 10 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            />
                            <span className="font-sans text-xl font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                                Voyage
                            </span>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="relative text-slate-600 dark:text-slate-300 font-medium hover:text-orange-500 dark:hover:text-orange-400 transition-colors group"
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full" />
                                </Link>
                            ))}
                        </nav>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            <ThemeToggle />

                            {isSignedIn ? (
                                <>
                                    <UserMeter />
                                    <UserButton />
                                </>
                            ) : (
                                <Link href="/sign-in" className="hidden md:block">
                                    <Button className="bg-orange-500 text-white hover:bg-orange-600 rounded-xl px-6 font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">
                                        Get Started
                                    </Button>
                                </Link>
                            )}

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                        >
                            <nav className="flex flex-col gap-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-orange-500 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                {!isSignedIn && (
                                    <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full mt-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl font-medium">
                                            Get Started
                                        </Button>
                                    </Link>
                                )}
                            </nav>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </header>
    );
}


