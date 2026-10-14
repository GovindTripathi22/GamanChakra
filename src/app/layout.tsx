import type { Metadata, Viewport } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "./globals.css";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { AuthProvider } from "@/components/auth-provider";
import { Jarvis } from "@/components/jarvis/jarvis";
import { Toaster } from "@/components/gc/toast";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Voyage — the travel OS that reads the world before it ruins your trip", template: "%s · Voyage" },
  description: "Autonomous travel-risk operating system: real-time world news, an in-house SLM, a voice co-pilot and an agent that re-routes, checks in and protects every traveller automatically.",
  manifest: "/manifest.json",
  applicationName: "Voyage",
  openGraph: { title: "Voyage", description: "Real-time, autonomous travel risk intelligence with a voice co-pilot.", type: "website" },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#070b16" }, { media: "(prefers-color-scheme: light)", color: "#f6f7fb" }] };

const THEME_BOOT = `try{var t=localStorage.getItem('theme')||'dark';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(d?'dark':'light')}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSession();
  const initialUser = s ? { id: s.uid, name: s.name, email: s.email, role: s.role, plan: s.plan, orgId: s.oid } : null;
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased font-sans bg-[var(--gc-bg)] text-[var(--gc-text)]" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-[var(--gc-brand)] focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
            <Header />
            <PwaRegister />
            <div id="main">{children}</div>
            <Jarvis />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
