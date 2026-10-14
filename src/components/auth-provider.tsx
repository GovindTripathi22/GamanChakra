"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { toast } from "@/components/gc/toast";

export interface ClientUser { id: string; name: string; email: string; role: string; plan: string; orgId: string }
interface AuthCtx { user: ClientUser | null; isSignedIn: boolean; isLoaded: boolean; refresh: () => Promise<void>; signOut: () => Promise<void>; startDemo: () => Promise<void> }

const Ctx = createContext<AuthCtx>({ user: null, isSignedIn: false, isLoaded: true, refresh: async () => {}, signOut: async () => {}, startDemo: async () => {} });

export function AuthProvider({ initialUser, children }: { initialUser: ClientUser | null; children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(initialUser);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setUser(j.user ? { ...j.user, orgId: j.org?.id ?? "" } : null);
    } catch { /* keep current state when offline */ }
  }, []);
  const signOut = useCallback(async () => {
    try { await fetch("/api/auth/signout", { method: "POST" }); } catch { /* cookie is cleared server-side when reachable */ }
    setUser(null);
    window.location.href = "/";
  }, []);
  const startDemo = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/demo", { method: "POST" });
      if (r.ok) { window.location.href = "/command"; return; }
      toast(r.status === 429 ? "Too many attempts — please wait a few seconds." : "The live demo is unavailable on this server.", "error");
    } catch { toast("Can't reach the server. Is it running?", "error"); }
  }, []);
  return <Ctx.Provider value={{ user, isSignedIn: !!user, isLoaded: true, refresh, signOut, startDemo }}>{children}</Ctx.Provider>;
}

export const useUser = () => useContext(Ctx);
