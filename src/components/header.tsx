"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, X, LogOut, Settings, Radar, LayoutDashboard, ShieldCheck, Bot, Workflow, Map, Scale, Plane, TrainFront, Mail, Compass } from "lucide-react";
import { useUser } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand";
import { useEventStream } from "@/components/gc/hooks";
import { cn } from "@/lib/utils";

const APP_NAV = [
  { href: "/command", label: "Mission Control", icon: LayoutDashboard },
  { href: "/duty-of-care", label: "Duty of Care", icon: ShieldCheck },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/risk", label: "Risk Radar", icon: Radar },
  { href: "/my-trips", label: "Trips", icon: Plane },
  { href: "/claims", label: "Claims", icon: Scale },
];
const PUBLIC_NAV = [
  { href: "/create-trip", label: "Plan a trip", icon: Map },
  { href: "/risk", label: "Risk Radar", icon: Radar },
  { href: "/waitlist-rescue", label: "Waitlist Rescue", icon: TrainFront },
  { href: "/#business", label: "For business", icon: ShieldCheck },
  { href: "/pricing", label: "Pricing", icon: Scale },
  { href: "/contact", label: "Contact", icon: Mail },
];

interface Notif { id: string; title: string; body: string; severity: string; link: string | null; createdAt: string; readAt: string | null }

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const load = async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
      setUnread(Number(j.unread) || 0);
    } catch { /* offline or server restarting: keep the last known state */ }
  };
  useEffect(() => { load(); }, []);
  useEventStream((e) => { if (e.type === "notification" || e.type === "checkin.update") load(); });
  useEffect(() => {
    const close = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button aria-label="Notifications" onClick={() => { setOpen(!open); if (!open && unread) fetch("/api/notifications", { method: "POST" }).then((r) => { if (r.ok) setUnread(0); }).catch(() => {}); }} className="relative h-9 w-9 grid place-items-center rounded-xl hover:bg-[var(--gc-panel-2)]">
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--gc-crit)] text-white text-[10px] font-bold grid place-items-center">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-24px)] gc-panel shadow-2xl z-50">
          <div className="px-4 py-3 border-b gc-line font-display font-semibold text-sm">Alerts</div>
          <div className="max-h-[420px] overflow-y-auto gc-scroll">
            {items.length === 0 && <p className="gc-muted text-sm p-4">No alerts yet. The agent will notify you here.</p>}
            {items.map((n) => (
              <Link key={n.id} href={n.link ?? "/command"} onClick={() => setOpen(false)} className="block px-4 py-3 border-b gc-line hover:bg-[var(--gc-panel-2)]">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", n.severity === "critical" ? "bg-red-500" : n.severity === "high" ? "bg-orange-500" : n.severity === "moderate" ? "bg-amber-500" : "bg-slate-400")} />
                  <span className="text-sm font-medium truncate">{n.title}</span>
                </div>
                <p className="gc-muted text-xs mt-1 line-clamp-2">{n.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user, isSignedIn, signOut } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const startTour = () => { if (pathname === "/command") window.dispatchEvent(new Event("gc:tour")); else router.push("/command?tour=1"); };
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = isSignedIn ? APP_NAV : PUBLIC_NAV;
  if (pathname?.startsWith("/checkin/")) return null;
  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3">
      <div className="mx-auto max-w-[1440px] rounded-2xl border gc-line backdrop-blur-xl bg-[color-mix(in_srgb,var(--gc-panel)_78%,transparent)] shadow-[0_10px_40px_-20px_rgba(0,0,0,.6)]">
      <div className="flex h-14 items-center gap-4 px-3 md:px-4">
        <Link href={isSignedIn ? "/command" : "/"} className="shrink-0" aria-label="Voyage home"><Wordmark /></Link>
        <nav className="hidden lg:flex items-center gap-0.5 ml-2" aria-label="Main">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 xl:px-3 py-2 text-[13px] xl:text-[13.5px] font-medium transition whitespace-nowrap", active ? "bg-[var(--gc-panel-2)] text-[var(--gc-text)]" : "gc-muted hover:text-[var(--gc-text)]")}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {isSignedIn ? (
            <>
              <button onClick={startTour} className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-[var(--gc-agent)] hover:bg-[var(--gc-agent)]/10" title="A quick guided tour of Mission Control"><Compass className="h-4 w-4" />Guide</button>
              <Notifications />
              <div className="relative">
                <button onClick={() => setMenu(!menu)} className="ml-1 flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[var(--gc-panel-2)]" aria-label="Account menu">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#ff6a1a] to-[#7c5cff] text-white text-xs font-bold">{user!.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                  <span className="hidden xl:block text-left leading-tight">
                    <span className="block text-[13px] font-medium">{user!.name}</span>
                    <span className="block text-[11px] gc-muted capitalize">{user!.plan} · {user!.role}</span>
                  </span>
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-56 gc-panel shadow-2xl z-50 p-1.5" onMouseLeave={() => setMenu(false)}>
                    <div className="px-3 py-2 text-xs gc-muted truncate">{user!.email}</div>
                    <Link href="/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--gc-panel-2)]"><Settings className="h-4 w-4" />Settings & API</Link>
                    <Link href="/pricing" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--gc-panel-2)]"><Scale className="h-4 w-4" />Plan & billing</Link>
                    <button onClick={signOut} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--gc-panel-2)] text-red-500"><LogOut className="h-4 w-4" />Sign out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="hidden sm:inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium hover:bg-[var(--gc-panel-2)]">Sign in</Link>
              <Link href="/sign-up" className="inline-flex h-9 items-center whitespace-nowrap rounded-xl px-3 sm:px-4 text-[13px] sm:text-sm font-semibold bg-[var(--gc-brand)] text-white hover:brightness-110">Get started</Link>
            </>
          )}
          <button className="lg:hidden h-9 w-9 grid place-items-center rounded-xl hover:bg-[var(--gc-panel-2)]" onClick={() => setMobile(!mobile)} aria-label="Open menu">{mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {mobile && (
        <nav className="lg:hidden border-t gc-line px-4 py-3 grid gap-1" aria-label="Mobile">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMobile(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--gc-panel-2)]"><n.icon className="h-4 w-4" />{n.label}</Link>
          ))}
          {isSignedIn && <button onClick={() => { setMobile(false); startTour(); }} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--gc-agent)] hover:bg-[var(--gc-panel-2)]"><Compass className="h-4 w-4" />Guided tour</button>}
        </nav>
      )}
      </div>
    </header>
  );
}
