"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff, Send, X, Ear, Volume2, VolumeX, Sparkles } from "lucide-react";
import { JarvisCard } from "./cards";
import { SafeBoundary } from "@/components/gc/error-boundary";
import type { JarvisResponse } from "@/lib/jarvis/brain";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Browser speech typings (Web Speech API is not in lib.dom for all TS) */
/* ------------------------------------------------------------------ */
interface SRResult { isFinal: boolean; 0: { transcript: string } }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SpeechRec { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: SREvent) => void) | null; onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null }
type SRCtor = new () => SpeechRec;
const getSR = (): SRCtor | null => (typeof window === "undefined" ? null : ((window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition ?? null));

const WAKE = /\b(hey|hi|ok|okay)?\s*(chakra|jarvis|चक्र|जार्विस)\b/i;

interface Msg { role: "user" | "assistant"; text: string; res?: JarvisResponse }
interface MeterSession { ctx: AudioContext | null; stream: MediaStream | null; raf: number; stopped: boolean }

export function Jarvis() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [wake, setWake] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lang, setLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const [level, setLevel] = useState(0);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRec | null>(null);
  const wakeRef = useRef<SpeechRec | null>(null);
  const audioRef = useRef<MeterSession | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followUps = msgs.length ? msgs[msgs.length - 1].res?.followUps ?? [] : ["What's happening in the world?", "Is Dubai safe right now?", "Plan 4 days in Goa", "My flight got cancelled"];

  useEffect(() => {
    setSupported(!!getSR());
    try { const l = localStorage.getItem("gc-jarvis-lang"); if (l === "hi-IN" || l === "en-IN") setLang(l); setMuted(localStorage.getItem("gc-jarvis-muted") === "1"); } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, interim]);

  /* ---------- text-to-speech (never throws; silently skipped where unsupported) ---------- */
  const speak = useCallback((text: string, voiceLang?: string) => {
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 600));
      const want = voiceLang ?? lang;
      const voices = window.speechSynthesis.getVoices() ?? [];
      u.voice = voices.find((v) => v.lang === want) ?? voices.find((v) => v.lang?.startsWith(want.slice(0, 2))) ?? null;
      u.lang = want;
      u.rate = 1.03;
      u.onstart = () => setSpeaking(true);
      u.onend = () => { setSpeaking(false); setLevel(0); };
      u.onerror = () => { setSpeaking(false); setLevel(0); };
      u.onboundary = () => setLevel(0.4 + Math.random() * 0.6);
      window.speechSynthesis.speak(u);
    } catch { setSpeaking(false); }
  }, [lang, muted]);

  /* ---------- ask the brain (single-flight, abortable, never leaves the UI stuck) ---------- */
  const inflight = useRef<AbortController | null>(null);
  const ask = useCallback(async (text: string) => {
    const q = text.trim().slice(0, 500);
    if (!q || inflight.current) return;
    const ctl = new AbortController();
    inflight.current = ctl;
    setOpen(true);
    setMsgs((m) => [...m.slice(-40), { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/jarvis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: q, lang, page: pathname }), signal: ctl.signal });
      const raw = await r.text();
      let j: (JarvisResponse & { error?: string }) | null = null;
      try { j = JSON.parse(raw); } catch { j = null; }
      if (!r.ok || !j || typeof j.reply !== "string") throw new Error(j?.error ?? (r.status === 429 ? "I'm getting a lot of requests — give me a few seconds" : "I couldn't reach the server"));
      const res: JarvisResponse = { ...j, cards: Array.isArray(j.cards) ? j.cards : [], followUps: Array.isArray(j.followUps) ? j.followUps : [] };
      setMsgs((m) => [...m, { role: "assistant", text: res.reply, res }]);
      speak(res.speak || res.reply, res.voice ?? res.lang);
      if (typeof res.navigate === "string" && res.navigate.startsWith("/") && !res.navigate.startsWith("//")) {
        const to = res.navigate;
        setTimeout(() => router.push(to), 900);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setMsgs((m) => [...m, { role: "assistant", text: `Sorry — ${e instanceof Error ? e.message : "something went wrong"}.` }]);
    } finally {
      if (inflight.current === ctl) inflight.current = null;
      setBusy(false);
    }
  }, [lang, pathname, router, speak]);

  /* ---------- mic level meter (drives the orb). Each session owns its own state object. ---------- */
  const stopMeter = useCallback(() => {
    const a = audioRef.current;
    audioRef.current = null;
    setLevel(0);
    if (!a) return;
    a.stopped = true;
    cancelAnimationFrame(a.raf);
    a.stream?.getTracks().forEach((t) => t.stop());
    a.ctx?.close().catch(() => {});
  }, []);
  const startMeter = useCallback(async () => {
    stopMeter();
    const session: MeterSession = { ctx: null, stream: null, raf: 0, stopped: false };
    audioRef.current = session;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (session.stopped || audioRef.current !== session) { stream.getTracks().forEach((t) => t.stop()); return; }
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an);
      session.ctx = ctx; session.stream = stream;
      const data = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        if (session.stopped) return;
        an.getByteFrequencyData(data);
        let sum = 0;
        for (const v of data) sum += v;
        setLevel(Math.min(1, sum / Math.max(1, data.length) / 90));
        session.raf = requestAnimationFrame(loop);
      };
      session.raf = requestAnimationFrame(loop);
    } catch { /* meter is decorative; recognition still works */ }
  }, [stopMeter]);

  /* ---------- push-to-talk ---------- */
  const listen = useCallback(() => {
    const SR = getSR();
    if (!SR) { setSupported(false); return; }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* already stopped */ } return; }
    try { wakeRef.current?.abort(); } catch { /* ignore */ } // only one recogniser at a time
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    let rec: SpeechRec;
    try { rec = new SR(); } catch { setSupported(false); return; }
    rec.lang = lang; rec.continuous = false; rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (!r?.[0]) continue; if (r.isFinal) finalText += r[0].transcript; else t += r[0].transcript; }
      setInterim(finalText + t);
    };
    rec.onerror = (e) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setMicError("Microphone access is blocked. Allow it in the browser's address bar, or just type.");
      else if (e?.error === "network") setMicError("Voice recognition needs an internet connection in this browser. Typing works offline.");
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      setListening(false); setInterim(""); stopMeter();
      const q = finalText.replace(WAKE, "").trim();
      if (q) askRef.current(q);
    };
    recRef.current = rec;
    setMicError(null);
    setOpen(true); setListening(true);
    try { rec.start(); } catch { recRef.current = null; setListening(false); return; }
    startMeter();
  }, [lang, startMeter, stopMeter]);

  // Latest callbacks for long-lived listeners (wake word, custom events) without re-subscribing.
  const askRef = useRef(ask);
  const listenRef = useRef(listen);
  const speakRef = useRef(speak);
  useEffect(() => { askRef.current = ask; listenRef.current = listen; speakRef.current = speak; }, [ask, listen, speak]);

  /* ---------- wake word ("Hey Chakra" / "Jarvis") ---------- */
  useEffect(() => {
    if (!wake) return;
    const SR = getSR();
    if (!SR) { setSupported(false); setWake(false); return; }
    let stopped = false;
    let current: SpeechRec | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (ms: number) => { if (!stopped) timer = setTimeout(start, ms); };
    function start() {
      if (stopped) return;
      if (recRef.current) { schedule(1000); return; } // push-to-talk in progress; try again later
      let w: SpeechRec;
      try { w = new SR!(); } catch { return; }
      w.lang = lang; w.continuous = true; w.interimResults = false;
      w.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i]?.[0]?.transcript ?? "";
          if (!WAKE.test(t)) continue;
          const rest = t.replace(WAKE, "").trim();
          try { w.abort(); } catch { /* ignore */ }
          if (rest.split(/\s+/).length >= 2) askRef.current(rest);
          else { setOpen(true); speakRef.current(lang === "hi-IN" ? "जी, बोलिए" : "Yes?"); setTimeout(() => listenRef.current(), 700); }
          return;
        }
      };
      w.onerror = (e) => { if (e?.error === "not-allowed") { stopped = true; setWake(false); setMicError("Microphone access is blocked, so the wake word is off."); } };
      w.onend = () => { if (wakeRef.current === w) wakeRef.current = null; if (current === w) current = null; schedule(600); };
      current = w;
      wakeRef.current = w;
      try { w.start(); } catch { schedule(1500); }
    }
    start();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      try { current?.abort(); } catch { /* ignore */ }
      if (wakeRef.current === current) wakeRef.current = null;
    };
  }, [wake, lang]);

  /* ---------- cleanup on unmount ---------- */
  useEffect(() => () => {
    try { recRef.current?.abort(); } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    inflight.current?.abort();
    stopMeter();
  }, [stopMeter]);

  /* ---------- open from anywhere: window.dispatchEvent(new CustomEvent("gc:jarvis", { detail: "question" })) ---------- */
  useEffect(() => {
    const h = (e: Event) => { const q = (e as CustomEvent<unknown>).detail; setOpen(true); if (typeof q === "string" && q.trim()) askRef.current(q); };
    window.addEventListener("gc:jarvis", h);
    return () => window.removeEventListener("gc:jarvis", h);
  }, []);

  /* ---------- keyboard: Ctrl/Cmd+J toggles, Esc closes ---------- */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (pathname?.startsWith("/checkin/")) return null;
  const active = listening || speaking || busy;
  const scale = 1 + level * 0.35;

  return (
    <>
      {/* Orb launcher */}
      <button
        onClick={() => (open ? listen() : setOpen(true))}
        data-tour="jarvis"
        aria-label={open ? "Talk to Chakra" : "Open Chakra voice assistant"}
        className="fixed bottom-5 right-5 z-50 h-16 w-16 rounded-full grid place-items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gc-brand)]"
      >
        <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#ff6a1a,#ffb020,#7c5cff,#22d3ee,#ff6a1a)] gc-spin-slow opacity-90" style={{ transform: `scale(${active ? scale : 1})`, transition: "transform 90ms linear" }} />
        <span className="absolute inset-[3px] rounded-full bg-[#0b1020]" />
        <span className={cn("absolute inset-[10px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#ffb020_18%,#ff6a1a_45%,#7c5cff_80%)]", !active && "gc-breathe")} style={{ transform: `scale(${0.85 + level * 0.3})`, transition: "transform 80ms linear", boxShadow: `0 0 ${18 + level * 40}px rgba(255,122,26,.65)` }} />
        {wake && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[var(--gc-bg)]" title="Listening for “Hey Chakra”" />}
      </button>

      {open && (
        <div role="dialog" aria-label="Chakra voice assistant" className="fixed bottom-24 right-5 z-50 w-[420px] max-w-[calc(100vw-24px)] h-[min(640px,calc(100vh-140px))] flex flex-col rounded-3xl border gc-line shadow-[0_30px_80px_-20px_rgba(0,0,0,.55)] overflow-hidden bg-[color-mix(in_srgb,var(--gc-panel)_92%,transparent)] backdrop-blur-2xl gc-fade-up">
          <div className="flex items-center gap-3 px-4 py-3 border-b gc-line">
            <div className="relative h-9 w-9 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#ffb020_20%,#ff6a1a_50%,#7c5cff_85%)]" style={{ transform: `scale(${1 + level * 0.2})` }} />
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold leading-tight">Chakra <span className="gc-muted font-normal text-xs">· voice co-pilot</span></div>
              <div className="text-[11px] gc-muted truncate">{listening ? "Listening…" : speaking ? "Speaking…" : busy ? "Thinking…" : "On-device SLM · no cloud AI"}</div>
            </div>
            <button onClick={() => { const l = lang === "en-IN" ? "hi-IN" : "en-IN"; setLang(l); try { localStorage.setItem("gc-jarvis-lang", l); } catch { /* ignore */ } }} className="h-8 px-2 rounded-lg text-xs font-semibold border gc-line" title="Language">{lang === "en-IN" ? "EN" : "हिं"}</button>
            <button onClick={() => setWake((w) => !w)} className={cn("h-8 w-8 grid place-items-center rounded-lg", wake ? "bg-emerald-500/15 text-emerald-500" : "hover:bg-[var(--gc-panel-2)]")} title="Wake word: “Hey Chakra”" aria-pressed={wake}><Ear className="h-4 w-4" /></button>
            <button onClick={() => { setMuted((m) => { try { localStorage.setItem("gc-jarvis-muted", m ? "0" : "1"); } catch { /* ignore */ } return !m; }); window.speechSynthesis?.cancel(); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel-2)]" title={muted ? "Unmute voice" : "Mute voice"}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
            <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel-2)]" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto gc-scroll px-4 py-4 space-y-3">
            {msgs.length === 0 && (
              <div className="text-center pt-6">
                <Sparkles className="h-6 w-6 mx-auto text-[var(--gc-brand)]" />
                <p className="font-display text-lg font-semibold mt-2">{lang === "hi-IN" ? "नमस्ते, मैं चक्र हूँ" : "Hi, I'm Chakra."}</p>
                <p className="gc-muted text-sm mt-1 px-6">{lang === "hi-IN" ? "माइक दबाएँ या लिखें। “हे चक्र” बोलकर भी बुला सकते हैं।" : "Tap the mic or type. Turn on the ear to wake me with “Hey Chakra”. Ctrl/⌘ + J toggles me anywhere."}</p>
                {!supported && <p className="text-xs mt-3 text-amber-600">Voice input needs Chrome or Edge — typing works everywhere.</p>}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[88%] space-y-2", m.role === "user" && "text-right")}>
                  <div className={cn("inline-block rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed text-left", m.role === "user" ? "bg-[var(--gc-brand)] text-white rounded-br-md" : "gc-panel-2 rounded-bl-md")}>{m.text}</div>
                  {m.res?.cards?.map((c, k) => <SafeBoundary key={k} label="This card" minHeight={60}><JarvisCard card={c} onSpeak={(t, v) => speak(t, v)} /></SafeBoundary>)}
                  {m.res && <div className="text-[10px] gc-muted">{String(m.res.intent ?? "").replace("_", " ")} · {Math.round((Number(m.res.confidence) || 0) * 100)}% · {m.res.latencyMs ?? 0} ms · {m.res.model}</div>}
                </div>
              </div>
            ))}
            {interim && <div className="flex justify-end"><div className="inline-block rounded-2xl px-3.5 py-2.5 text-[14px] bg-[var(--gc-brand)]/60 text-white italic">{interim}</div></div>}
            {busy && <div className="flex gap-1 pl-2">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 rounded-full bg-[var(--gc-brand)] animate-bounce" style={{ animationDelay: `${d * 120}ms` }} />)}</div>}
          </div>

          {followUps.length > 0 && !busy && (
            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto gc-scroll">
              {followUps.map((f) => <button key={f} onClick={() => ask(f)} className="shrink-0 rounded-full border gc-line px-3 py-1.5 text-xs hover:bg-[var(--gc-panel-2)]">{f}</button>)}
            </div>
          )}

          {micError && <div role="alert" className="mx-4 mb-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">{micError}</div>}
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2 border-t gc-line p-3">
            <button type="button" onClick={listen} disabled={!supported} aria-label={listening ? "Stop listening" : "Start voice input"} className={cn("h-11 w-11 shrink-0 rounded-2xl grid place-items-center transition", listening ? "bg-red-500 text-white animate-pulse" : "bg-[var(--gc-agent)] text-white hover:brightness-110", !supported && "opacity-40")}>
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <input value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder={lang === "hi-IN" ? "पूछिए… जैसे: क्या गोवा सुरक्षित है?" : "Ask anything… e.g. Is Bangkok safe this week?"} className="flex-1 h-11 rounded-2xl gc-panel-2 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--gc-brand)]/50" aria-label="Message Chakra" />
            <button type="submit" disabled={!input.trim() || busy} className="h-11 w-11 shrink-0 rounded-2xl grid place-items-center bg-[var(--gc-brand)] text-white disabled:opacity-40" aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
