"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Mic, PlayCircle, Radio, Cpu, Bot, ShieldCheck, Workflow, Route, Scale, Globe2, WifiOff, Plug, Languages, Newspaper, Brain, ListChecks, Zap, RefreshCcw, Building2, User } from "lucide-react";
import { useApi } from "@/components/gc/hooks";
import { WorldMap, type MapEvent } from "@/components/gc/world-map";
import { CategoryBadge, Btn } from "@/components/gc/ui";
import { ChakraMark } from "@/components/brand";
import { useUser } from "@/components/auth-provider";
import { Hero } from "@/components/hero";
import { DestinationSection } from "@/components/destination-section";

const indianDestinations = [
  {
    name: "Goa",
    image: "/destinations/goa.jpg",
    description: "Sun, sand, and spices. Experience the perfect blend of Indian and Portuguese cultures.",
    price: "₹14,200 – ₹21,800",
    typicalDays: "Typical 4 days for 2",
    slug: "goa",
  },
  {
    name: "Jaipur",
    image: "/destinations/jaipur.jpg",
    description: "The Pink City awaits with its majestic forts, palaces, and vibrant bazaars.",
    price: "₹11,500 – ₹17,900",
    typicalDays: "Typical 3 days for 2",
    slug: "jaipur",
  },
  {
    name: "Kerala",
    image: "/destinations/kerala.jpg",
    description: "God's Own Country. Cruise through backwaters and explore lush green tea plantations.",
    price: "₹18,000 – ₹26,500",
    typicalDays: "Typical 5 days for 2",
    slug: "kerala",
  },
  {
    name: "Varanasi",
    image: "/destinations/varanasi.jpg",
    description: "The spiritual capital of India. Witness the ancient Ganga Aarti and find inner peace.",
    price: "₹9,800 – ₹15,200",
    typicalDays: "Typical 3 days for 2",
    slug: "varanasi",
  },
];

const internationalDestinations = [
  {
    name: "Paris",
    image: "/destinations/paris.jpg",
    description: "The City of Light. Experience romance, art, and world-class cuisine.",
    price: "₹82,000 – ₹1,24,000",
    typicalDays: "Typical 5 days for 2",
    slug: "paris",
  },
  {
    name: "Dubai",
    image: "/destinations/dubai.jpg",
    description: "A futuristic oasis. Shop at the world's largest malls and admire the skyline.",
    price: "₹54,000 – ₹86,000",
    typicalDays: "Typical 4 days for 2",
    slug: "dubai",
  },
  {
    name: "Tokyo",
    image: "/destinations/tokyo.jpg",
    description: "Where tradition meets technology. Explore neon-lit streets and ancient temples.",
    price: "₹1,15,000 – ₹1,68,000",
    typicalDays: "Typical 6 days for 2",
    slug: "tokyo",
  },
  {
    name: "New York",
    image: "/destinations/new-york.jpg",
    description: "The city that never sleeps. Visit Times Square, Central Park, and Broadway.",
    price: "₹1,45,000 – ₹2,10,000",
    typicalDays: "Typical 5 days for 2",
    slug: "new-york",
  },
];


interface Overview { events: (MapEvent & { url: string; source: string; publishedAt: string; provenance: string })[]; leaderboard: { name: string; score: number }[]; lastRun: { summary: string | null } | null }
interface SlmInfo { report?: { blind?: { intentAccuracy: number; categoryAccuracy: number; travelRelevanceAccuracy: number; severityWithinOne: number }; params?: number; examples?: number } }

const LOOP = [
  { k: "Sense", c: "#38bdf8", icon: Newspaper, d: "Pulls GDELT, USGS, GDACS, Google News & global RSS every few minutes — and a dedicated news watch for every destination you're travelling to." },
  { k: "Think", c: "#a78bfa", icon: Brain, d: "Chakra-Nano classifies each headline (12 risk classes, 4 severities), geotags it and scores travel impact in under a millisecond." },
  { k: "Plan", c: "#fbbf24", icon: ListChecks, d: "Matches events to every trip and traveller by distance and dates, then drafts responses from expert playbooks and your automation rules." },
  { k: "Act", c: "#ff6a1a", icon: Zap, d: "Sends advisories, safety check-ins, re-routes, claim letters and webhooks — automatically or for approval, depending on the autonomy level you set." },
  { k: "Reflect", c: "#34d399", icon: RefreshCcw, d: "Writes a full reasoning trace for audit and keeps watching. Every decision is explainable and reversible." },
];

const FEATURES = [
  { icon: Radio, t: "Real-time world news engine", d: "10+ keyless live sources, de-duplicated, geotagged and impact-scored. No API keys, ever." },
  { icon: Cpu, t: "Chakra-Nano — our own SLM", d: "A multi-task neural model trained from scratch in this repo. Runs on any CPU in <1 ms. Optional local generative SLM via Ollama." },
  { icon: Bot, t: "Autonomous agent with guard-rails", d: "Five autonomy levels (Observe → Autopilot). Idempotent, auditable, human-in-the-loop by design." },
  { icon: Mic, t: "Jarvis voice co-pilot", d: "“Hey Chakra, is Bangkok safe this week?” English, Hindi & Hinglish. Wake word, push-to-talk, spoken answers." },
  { icon: ShieldCheck, t: "Duty of care at scale", d: "Know who is exposed in seconds. One-tap “Are you safe?” check-ins via link or WhatsApp — replies stream in live." },
  { icon: Route, t: "Auto re-routing", d: "When fog grounds flights or a bandh shuts roads, ranked train/bus/cab/flight alternatives are ready before you ask." },
  { icon: Scale, t: "Compensation on autopilot", d: "DGCA, EU261, UK261 and US DOT entitlement checks with ready-to-send claim letters." },
  { icon: Workflow, t: "No-code automations", d: "“When a cyclone is within 200 km of a traveller → check in + escalate.” Built in a minute." },
  { icon: Plug, t: "Partner Risk API, MCP & webhooks", d: "Sell or embed the intelligence: REST risk index, Model Context Protocol tools and HMAC-signed webhooks." },
  { icon: WifiOff, t: "Offline-first PWA", d: "Emergency pass, itinerary and phrasebook work without a signal. The vector world map needs no tile server." },
  { icon: Languages, t: "Traveller phrasebook", d: "Essential phrases in 10 languages with native script, pronunciation and text-to-speech." },
  { icon: Globe2, t: "Keyless AI trip planner", d: "Crowd-aware, geo-clustered itineraries with honest cost ranges — and live risk on every stop." },
];

export default function Home() {
  const { startDemo, isSignedIn } = useUser();
  const [demoBusy, setDemoBusy] = useState(false);
  const ov = useApi<Overview>("/api/overview", { refreshMs: 60000 });
  const slm = useApi<SlmInfo>("/api/slm");
  const events = (ov.data?.events ?? []).filter((e) => e.category !== "not_travel");
  const blind = slm.data?.report?.blind;
  const openJarvis = (q?: string) => window.dispatchEvent(new CustomEvent("gc:jarvis", { detail: q }));
  const demo = async () => { setDemoBusy(true); await startDemo(); setDemoBusy(false); };

  return (
    <main className="overflow-x-hidden">
      {/* ORIGINAL HERO — kept intact, elevated with live risk + voice */}
      <Hero />

      {/* THE OS */}
      <section className="relative">
        <div className="absolute inset-0 gc-grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(255,106,26,.25),transparent)] blur-2xl" aria-hidden />
        <div className="relative mx-auto max-w-[1280px] px-4 md:px-6 pt-16 md:pt-20 pb-10 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border gc-line px-3 py-1.5 text-xs font-medium gc-panel">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Autonomous travel-risk OS · India-first, worldwide
            </div>
            <h2 className="font-display text-[40px] md:text-[58px] leading-[1.03] font-semibold mt-5 tracking-tight">
              The travel OS that <span className="gc-gradient-text">reads the world</span> before it ruins your trip.
            </h2>
            <p className="text-lg gc-muted mt-5 max-w-xl leading-relaxed">Voyage watches real-time global news, understands it with its own small language model, and an autonomous agent re-routes, checks in and protects every traveller — by voice, in English or Hindi.</p>
            <div className="flex flex-wrap gap-3 mt-8">
              {isSignedIn ? <Link href="/command"><Btn size="lg">Open Mission Control <ArrowRight className="h-4 w-4" /></Btn></Link> : <Btn size="lg" onClick={demo} loading={demoBusy}><PlayCircle className="h-5 w-5" />Launch the live demo</Btn>}
              <Btn size="lg" variant="outline" onClick={() => openJarvis()}><Mic className="h-4 w-4" />Talk to Chakra</Btn>
              <a href="#how-it-works"><Btn size="lg" variant="ghost">How it works <ArrowRight className="h-4 w-4" /></Btn></a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm gc-muted">
              <span>✓ Zero API keys</span><span>✓ In-house SLM, runs on CPU</span><span>✓ Self-hostable</span><span>✓ Human-in-the-loop</span>
            </div>
          </div>
          <div className="relative">
            <div className="gc-panel p-2 shadow-[0_40px_120px_-40px_rgba(255,106,26,.45)]">
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="font-semibold flex items-center gap-2"><Radio className="h-3.5 w-3.5 text-emerald-500" />Live world risk</span>
                <span className="gc-muted">{events.length} travel events · 72h</span>
              </div>
              <WorldMap events={events} height={340} />
            </div>
            {ov.data?.lastRun?.summary && (
              <div className="absolute -bottom-6 -left-4 md:-left-10 max-w-[320px] gc-panel p-3 shadow-2xl gc-fade-up">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--gc-agent)]"><Bot className="h-3.5 w-3.5" />Agent · last cycle</div>
                <p className="text-[13px] mt-1 leading-snug line-clamp-4">{ov.data.lastRun.summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* TICKER */}
        {events.length > 0 && (
          <div className="relative border-y gc-line py-3 overflow-hidden" aria-label="Live headlines">
            <div className="flex w-max gap-8 gc-marquee">
              {[...events.slice(0, 18), ...events.slice(0, 18)].map((e, i) => (
                <a key={`${e.id}-${i}`} href={e.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm whitespace-nowrap hover:underline">
                  <CategoryBadge category={e.category} /><span>{e.title.replace(/^drill:\s*/i, "")}</span>{e.placeName && <span className="gc-muted">· {e.placeName}</span>}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ORIGINAL DESTINATIONS — kept, now with a live risk index on every card */}
      <DestinationSection
        title="Popular in India"
        subtitle="Transparent cost estimates sourced from real transport, stays, and entry benchmarks — with live risk from today's news"
        destinations={indianDestinations}
      />
      <div className="bg-[var(--gc-panel)]/40 border-y gc-line">
        <DestinationSection
          title="International Top Picks"
          subtitle="Explore the world's most fascinating destinations with honest line-item ranges"
          destinations={internationalDestinations}
        />
      </div>

      {/* PROBLEM */}
      <section id="how-it-works" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 md:px-6 py-20">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gc-brand)]">The problem</div>
          <h2 className="font-display text-4xl font-semibold mt-3 leading-tight">Trips break because of the world — and nobody is watching the world for you.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            ["Disruptions are found too late", "Fog, strikes, bandhs, floods and airspace closures are in the news hours before they hit your booking. Travellers find out at the gate."],
            ["Companies can't see their people", "When an earthquake or a curfew hits, travel desks scramble through spreadsheets and phone calls to learn who is safe."],
            ["AI planners don't know what's happening", "Generic AI itineraries ignore today's reality and invent prices. Nothing re-plans when the ground truth changes."],
          ].map(([t, d]) => <div key={t} className="gc-panel p-6"><div className="font-display text-lg font-semibold">{t}</div><p className="gc-muted mt-2 text-[15px] leading-relaxed">{d}</p></div>)}
        </div>
      </section>

      {/* LOOP */}
      <section className="border-y gc-line bg-[var(--gc-panel)]/40">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gc-agent)]">How the agent works</div>
              <h2 className="font-display text-4xl font-semibold mt-3 leading-tight">An autonomous loop that never sleeps.</h2>
              <p className="gc-muted mt-3">Every cycle is persisted step-by-step, so you can audit exactly why the agent did what it did.</p>
            </div>
            <div className="relative h-28 w-28 shrink-0 hidden md:block"><ChakraMark size={112} spin /></div>
          </div>
          <ol className="grid md:grid-cols-5 gap-3 mt-10">
            {LOOP.map((s, i) => (
              <li key={s.k} className="gc-panel p-5 relative">
                <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: `${s.c}22`, color: s.c }}><s.icon className="h-4 w-4" /></span><span className="text-xs gc-muted">0{i + 1}</span></div>
                <div className="font-display text-xl font-semibold mt-3" style={{ color: s.c }}>{s.k}</div>
                <p className="text-sm gc-muted mt-2 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gc-brand)]">Everything in one OS</div>
          <h2 className="font-display text-4xl font-semibold mt-3 leading-tight">Built for the whole travel industry.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {FEATURES.map((f) => (
            <div key={f.t} className="gc-panel p-5 hover:-translate-y-0.5 transition">
              <f.icon className="h-5 w-5 text-[var(--gc-brand)]" />
              <div className="font-semibold mt-3">{f.t}</div>
              <p className="text-sm gc-muted mt-1.5 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AUDIENCES */}
      <section id="business" className="mx-auto max-w-[1280px] px-4 md:px-6 pb-20 grid md:grid-cols-2 gap-4">
        <div className="gc-panel p-8">
          <User className="h-6 w-6 text-[var(--gc-brand)]" />
          <h3 className="font-display text-2xl font-semibold mt-3">For travellers</h3>
          <p className="gc-muted mt-2">A personal guardian in your pocket. Plan in seconds, hear about trouble before it reaches you, and let Chakra fix it.</p>
          <ul className="mt-4 space-y-1.5 text-sm"><li>• Voice co-pilot in English & Hindi</li><li>• Live risk on every destination</li><li>• Automatic re-routes & refund claims</li><li>• Offline emergency pass</li></ul>
          <Link href="/create-trip" className="inline-flex mt-6"><Btn variant="outline">Plan a trip free <ArrowRight className="h-4 w-4" /></Btn></Link>
        </div>
        <div className="gc-panel p-8 gc-glow">
          <Building2 className="h-6 w-6 text-[var(--gc-agent)]" />
          <h3 className="font-display text-2xl font-semibold mt-3">For TMCs, OTAs, tour operators & corporate travel</h3>
          <p className="gc-muted mt-2">Duty-of-care, disruption ops and risk intelligence in one console — with an agent doing the first response for you.</p>
          <ul className="mt-4 space-y-1.5 text-sm"><li>• See exposed travellers on one live map</li><li>• Mass check-ins with live replies</li><li>• Approvals inbox, audit trail, automations</li><li>• Partner Risk API, MCP & signed webhooks</li></ul>
          <div className="flex flex-wrap gap-2 mt-6"><Btn variant="agent" onClick={demo} loading={demoBusy}>See the B2B demo <ArrowRight className="h-4 w-4" /></Btn><Link href="/pricing"><Btn variant="outline">Pricing</Btn></Link></div>
        </div>
      </section>

      {/* PROOF */}
      <section className="border-t gc-line">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-16 grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gc-agent)]">Our own small language model</div>
            <h2 className="font-display text-3xl font-semibold mt-3">Chakra-Nano. No cloud AI, no API bills, no data leaving your server.</h2>
            <p className="gc-muted mt-3">Trained from scratch on a curated travel-risk corpus. Measured on a blind test set it never saw during training.</p>
            <Link href="/risk" className="inline-flex mt-5 text-[var(--gc-brand)] font-medium">Try it in the playground →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Voice-intent accuracy", blind ? `${(blind.intentAccuracy * 100).toFixed(1)}%` : "—"],
              ["Travel-relevance accuracy", blind ? `${(blind.travelRelevanceAccuracy * 100).toFixed(1)}%` : "—"],
              ["12-way risk category", blind ? `${(blind.categoryAccuracy * 100).toFixed(1)}%` : "—"],
              ["Severity within ±1 level", blind ? `${(blind.severityWithinOne * 100).toFixed(1)}%` : "—"],
            ].map(([l, v]) => <div key={l} className="gc-panel p-5"><div className="font-display text-4xl font-semibold gc-gradient-text">{v}</div><div className="text-sm gc-muted mt-1">{l}</div></div>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1280px] px-4 md:px-6 pb-24">
        <div className="relative overflow-hidden rounded-[28px] p-10 md:p-14 text-white bg-[linear-gradient(120deg,#ff6a1a,#c2410c_45%,#5b3bd6)]">
          <div className="absolute -right-24 -top-24 opacity-20"><ChakraMark size={360} spin /></div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold max-w-2xl leading-tight relative">Let the world change. Your travellers will be fine.</h2>
          <div className="flex flex-wrap gap-3 mt-8 relative">
            <button onClick={demo} className="h-12 px-6 rounded-xl bg-white text-[#c2410c] font-semibold inline-flex items-center gap-2">{demoBusy ? "Loading…" : "Launch the live demo"} <ArrowRight className="h-4 w-4" /></button>
            <button onClick={() => openJarvis("What can you do?")} className="h-12 px-6 rounded-xl border border-white/40 font-semibold inline-flex items-center gap-2"><Mic className="h-4 w-4" />Ask Chakra</button>
          </div>
        </div>
        <footer className="flex flex-col md:flex-row justify-between gap-4 mt-12 text-sm gc-muted">
          <span suppressHydrationWarning>© {new Date().getFullYear()} Voyage</span>
          <span className="flex gap-5"><Link href="/pricing">Pricing</Link><Link href="/risk">Risk Radar</Link><Link href="/claims">Claims</Link><Link href="/contact">Contact</Link></span>
        </footer>
      </section>
    </main>
  );
}
