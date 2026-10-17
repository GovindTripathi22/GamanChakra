"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Trip Planner", icon: Compass },
  { href: "/my-trips", label: "My Trips", icon: MapPin },
  { href: "/waitlist-rescue", label: "Waitlist Rescue", icon: Train },
  { href: "/risk", label: "Risk Radar", icon: ShieldAlert },
  { href: "/financial-os", label: "Financial OS", icon: Wallet },
  { href: "/destination-intelligence", label: "Destinations", icon: Sparkles },
];

export function Header() {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMissionControl =
    pathname.startsWith("/command") ||
    pathname.startsWith("/control-tower") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/world-model");

  const isVoyageActive = !isMissionControl;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo + Clickable Mode Switcher (Voyage | Mission Control) */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white hover:opacity-90 transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <span className="text-lg tracking-tight">GamanChakra</span>
          </Link>

          {/* Mode Switcher Pill: VOYAGE (Main Trip Planner Home) vs MISSION CONTROL */}
          <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/70 dark:border-slate-800">
            <Link
              href="/"
              title="Go to Main Trip Planner Home Page"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isVoyageActive
                  ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Voyage</span>
            </Link>

            <Link
              href="/command"
              title="Go to Mission Control"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isMissionControl
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
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
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
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

        {/* Right side controls: ThemeToggle + Mobile Menu Button */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
              Voyage (Home)
            </Link>
            <Link
              href="/command"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <Layers className="h-4 w-4" />
              Mission Control
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
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

export default Header;
