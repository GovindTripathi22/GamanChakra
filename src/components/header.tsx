"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Radar,
  Train,
  ShieldAlert,
  Wallet,
  Sparkles,
  Menu,
  X,
  MapPin,
  Layers,
  LogOut,
  Settings,
  CreditCard,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand";
import { useUser } from "@/components/auth-provider";

const NAV_LINKS = [
  { href: "/my-trips", label: "My Trips", icon: MapPin },
  { href: "/waitlist-rescue", label: "Waitlist Rescue", icon: Train },
  { href: "/risk", label: "Risk Radar", icon: ShieldAlert },
  { href: "/financial-os", label: "Financial OS", icon: Wallet },
  { href: "/destination-intelligence", label: "Destinations", icon: Sparkles },
];

export function Header() {
  const pathname = usePathname() || "/";
  const { user, isSignedIn, signOut } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isMissionControl =
    pathname.startsWith("/command") ||
    pathname.startsWith("/control-tower") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/world-model");

  const isVoyageActive = !isMissionControl;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Voyage Brand Wordmark + Mode Switcher (Trip Planner vs Mission Control) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="flex items-center hover:opacity-90 transition shrink-0"
            aria-label="Voyage home"
          >
            <Wordmark size={30} />
          </Link>

          {/* Mode Switcher Pill: TRIP PLANNER vs MISSION CONTROL */}
          <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/70 dark:border-slate-800">
            <Link
              href="/"
              title="Voyage Trip Planner"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isVoyageActive
                  ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Trip Planner</span>
            </Link>

            <Link
              href="/command"
              title="Mission Control Center"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isMissionControl
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Radar className="h-3.5 w-3.5" />
              <span>Mission Control</span>
            </Link>
          </div>
        </div>

        {/* Center/Right Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side controls: ThemeToggle + Auth + Mobile Menu Button */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isSignedIn && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Account menu"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xs font-bold shadow-xs">
                  {user.name ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("") : "U"}
                </span>
                <span className="hidden xl:block text-left leading-tight pr-1">
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {user.name}
                  </span>
                  <span className="block text-[10px] text-slate-500 capitalize">
                    {user.plan}
                  </span>
                </span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-1.5">
                  <div className="px-3 py-2 text-xs text-slate-500 truncate border-b border-slate-100 dark:border-slate-800 mb-1">
                    {user.email}
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                    <span>Settings & API</span>
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    <span>Plan & Billing</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-left cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link
                href="/sign-in"
                className="h-8 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition grid place-items-center"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:brightness-105 shadow-xs transition grid place-items-center"
              >
                Get started
              </Link>
            </div>
          )}

          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
          <div className="grid grid-cols-2 gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
            >
              <Compass className="h-4 w-4" />
              <span>Trip Planner</span>
            </Link>
            <Link
              href="/command"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <Radar className="h-4 w-4" />
              <span>Mission Control</span>
            </Link>
          </div>
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Icon className="h-4 w-4 text-slate-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {!isSignedIn && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-lg py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-lg py-2 text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-600 text-white"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
