import { db } from "@/lib/db";
import { classifyIntent, classifyNews, NANO_INFO, type IntentResult } from "@/lib/slm/nano";
import { generate, generativeAvailable, CHAKRA_SYSTEM_PROMPT } from "@/lib/slm/generative";
import { destinationRisk } from "@/lib/risk/engine";
import { findPlace, haversineKm, type Place } from "@/lib/geo/gazetteer";
import { findAlternatives } from "@/lib/agent/alternatives";
import { estimateCompensation } from "@/lib/claims/calculator";
import { convert } from "@/lib/fx";
import { translatePhrase, SUPPORTED_PHRASES } from "./phrasebook";
import { fetchLiveWeather } from "@/lib/providers/weather/open-meteo-provider";
import { getEmergencyDirectory } from "@/lib/emergency/directory";
import { planTripLocally } from "@/lib/planner/local-planner";
import { runAgentCycle } from "@/lib/agent/runner";
import { executeTask } from "@/lib/agent/executor";
import { LEVEL_INFO, type AutonomyLevel } from "@/lib/agent/policy";
import { CATEGORY_META, type NewsCategory } from "@/lib/slm/labels";
import { inr } from "@/lib/slm/nlg";
import type { SessionPayload } from "@/lib/auth/token";

export type Card =
  | { type: "risk"; place: string; score: number; band: string; drivers: { title: string; category: string; severity: string; distanceKm: number; url: string; provenance: string }[]; advice: string[] }
  | { type: "news"; title: string; items: { id: string; title: string; category: string; severity: string; placeName: string | null; url: string; impactScore: number; provenance: string; publishedAt: string }[] }
  | { type: "weather"; place: string; tempC: number; condition: string; rainChance: number; advisory: string; source: string }
  | { type: "routes"; from?: string; to: string; options: ReturnType<typeof findAlternatives> }
  | { type: "plan"; destination: string; days: number; total: string; highlights: string[]; href: string }
  | { type: "trips"; trips: { id: string; title: string; destination: string; status: string; risk: number }[] }
  | { type: "travelers"; title: string; travelers: { id: string; name: string; destination: string; exposure: number; status: string }[] }
  | { type: "fx"; amount: number; from: string; to: string; result: number; rate: number; source: string }
  | { type: "phrase"; phrase: string; language: string; native: string; roman: string; voice: string }
  | { type: "claim"; regime: string; eligible: boolean; amount: number; currency: string; entitlements: string[]; reasoning: string[] }
  | { type: "list"; title: string; items: string[] }
  | { type: "emergency"; place: string; numbers: { label: string; number: string }[]; hospitals: string[] }
  | { type: "agent"; summary: string; executed: number; proposed: number; runId: string };

export interface JarvisResponse {
  reply: string;
  speak: string;
  lang: string;
  voice?: string; // BCP-47 voice for TTS (e.g. phrase in Japanese)
  intent: string;
  confidence: number;
  cards: Card[];
  navigate?: string;
  followUps: string[];
  model: string;
  latencyMs: number;
}

const isHindi = (text: string, lang?: string) => lang?.startsWith("hi") || /[ऀ-ॿ]/.test(text);
const T = (hi: boolean, en: string, hin: string) => (hi ? hin : en);

async function userTripsPlace(session: SessionPayload | null): Promise<{ place: Place | null; home: Place | null; tripId?: string }> {
  if (!session) return { place: null, home: null };
  const trip = await db.trip.findFirst({ where: { ownerId: session.uid, status: { in: ["planned", "active"] } }, orderBy: { createdAt: "desc" } });
  if (!trip) return { place: null, home: null };
  return { place: findPlace(trip.destination.split(/->|\|/)[0].trim()), home: findPlace(trip.origin), tripId: trip.id };
}

function packingList(place: Place | null, days: number, tempC?: number, rain?: number): string[] {
  const list = ["Passport / ID + digital copies", "Phone, charger & power bank", "Universal adapter", "Basic medicines & prescriptions", "Reusable water bottle", `${Math.min(days, 7)} sets of clothes (laundry mid-trip if longer)`];
  if (tempC != null && tempC < 12) list.push("Thermal layer, warm jacket, gloves & beanie");
  if (tempC != null && tempC > 30) list.push("Breathable cotton/linen, sunscreen SPF 50, cap, ORS sachets");
  if ((rain ?? 0) > 50) list.push("Compact umbrella / rain jacket, quick-dry footwear, zip-lock pouches");
  if (place && /goa|bali|phuket|male|andaman|maldives|krabi/i.test(place.name)) list.push("Swimwear, flip-flops, reef-safe sunscreen");
  if (place && /leh|manali|spiti|srinagar|kedarnath|darjeeling|gangtok/i.test(place.name)) list.push("Altitude meds (consult doctor), lip balm, layers for −5 °C nights");
  if (place && place.countryCode !== "IN") list.push("Forex card + some local cash, travel insurance, visa printouts");
  list.push("Offline emergency pass (Voyage → Trip → Emergency)");
  return list;
}

function estimateCost(place: Place, days: number, pax: number, tier = 1) {
  const intl = place.countryCode !== "IN";
  const perDay = intl ? [5500, 9500, 22000][tier] : [2200, 4200, 11000][tier];
  const travel = intl ? 28000 : 7000;
  const min = Math.round((perDay * days + travel) * pax * 0.85);
  const max = Math.round((perDay * days + travel) * pax * 1.3);
  return { min, max };
}

export async function jarvisRespond(text: string, opts: { session: SessionPayload | null; lang?: string; currentPage?: string }): Promise<JarvisResponse> {
  const t0 = performance.now();
  const hi = isHindi(text, opts.lang);
  const r: IntentResult = classifyIntent(text);
  const s = r.slots;
  const cards: Card[] = [];
  let reply = "";
  let navigate: string | undefined;
  let voice: string | undefined;
  let followUps: string[] = [];
  const place = s.destination ?? null;
  const session = opts.session;
  const lowConfidence = r.confidence < 0.4;

  const intent = lowConfidence && r.intent !== "out_of_scope" ? (place ? "safety_check" : "help") : r.intent;

  switch (intent) {
    case "greeting":
      reply = T(hi, `Hello${session ? ` ${session.name.split(" ")[0]}` : ""}! I'm Chakra. I watch world news against your trips. Ask me "is it safe to go to Bangkok?" or "plan 4 days in Goa".`, `नमस्ते${session ? ` ${session.name.split(" ")[0]}` : ""}! मैं चक्र हूँ। मैं दुनिया की खबरों को आपकी यात्रा से मिलाकर देखता हूँ। पूछिए — "क्या बैंकॉक जाना सुरक्षित है?"`);
      followUps = ["What's happening in the world?", "Is my trip safe?", "Plan 3 days in Jaipur"];
      break;
    case "help":
      reply = T(hi, "I can check destination risk from live news, brief you on alerts, plan trips, find re-routes when flights or trains fail, estimate compensation, convert currency, translate phrases, and — for teams — check on every traveller and run the autonomous agent.", "मैं लाइव खबरों से जोखिम देख सकता हूँ, यात्रा प्लान कर सकता हूँ, फ्लाइट या ट्रेन रद्द होने पर विकल्प ढूँढ सकता हूँ, मुआवज़ा बता सकता हूँ और टीम के हर यात्री की सुरक्षा जाँच सकता हूँ।");
      followUps = ["Brief me on travel alerts", "Is Dubai safe right now?", "My flight got cancelled"];
      break;
    case "safety_check": {
      const target = place ?? (await userTripsPlace(session)).place;
      if (!target) { reply = T(hi, "Which destination should I check?", "किस जगह का जोखिम देखूँ?"); followUps = ["Is Goa safe?", "Is Paris safe?"]; break; }
      const risk = await destinationRisk(target.name);
      cards.push({ type: "risk", place: target.name, score: risk.score, band: risk.band, drivers: risk.drivers.slice(0, 4).map((d) => ({ title: d.title, category: d.category, severity: d.severity, distanceKm: d.distanceKm, url: d.url, provenance: d.provenance })), advice: risk.advice });
      const top = risk.drivers[0];
      if (risk.score < 15) reply = T(hi, `${target.name} looks clear right now — risk ${risk.score}/100. I'll keep watching the news for you.`, `${target.name} अभी सुरक्षित दिख रहा है — जोखिम ${risk.score}/100। मैं खबरों पर नज़र रखूँगा।`);
      else reply = T(hi, `${target.name} is at ${risk.band} risk, ${risk.score}/100. Main driver: ${top?.title.replace(/^drill:\s*/i, "")}. ${risk.advice[0] ?? ""}`, `${target.name} में जोखिम ${risk.score}/100 है। मुख्य कारण: ${top?.title.replace(/^drill:\s*/i, "")}। ${risk.advice[0] ?? ""}`);
      followUps = [`Find alternatives to ${target.name}`, `Weather in ${target.name}`, `Latest news from ${target.name}`];
      break;
    }
    case "news_brief": {
      const where = place;
      const items = await db.newsEvent.findMany({
        where: { publishedAt: { gt: new Date(Date.now() - 48 * 36e5) }, impactScore: { gt: 0 }, ...(where ? { OR: [{ placeName: where.name }, { countryCode: where.countryCode }] } : {}) },
        orderBy: [{ impactScore: "desc" }], take: 6,
      });
      cards.push({ type: "news", title: where ? `Latest for ${where.name}` : "Top travel-impacting events", items: items.map((e) => ({ id: e.id, title: e.title, category: e.category, severity: e.severity, placeName: e.placeName, url: e.url, impactScore: e.impactScore, provenance: e.provenance, publishedAt: e.publishedAt.toISOString() })) });
      if (!items.length) reply = T(hi, `Nothing travel-relevant${where ? ` for ${where.name}` : ""} in the last 48 hours.`, `पिछले 48 घंटों में${where ? ` ${where.name} के लिए` : ""} यात्रा से जुड़ी कोई बड़ी खबर नहीं है।`);
      else {
        const top3 = items.slice(0, 3).map((e) => `${e.title.replace(/^drill:\s*/i, "")}${e.placeName ? ` (${e.placeName})` : ""}`);
        reply = T(hi, `Here's what matters${where ? ` for ${where.name}` : ""}: ${top3.join("; ")}.`, `मुख्य खबरें: ${top3.join("; ")}।`);
        if (await generativeAvailable()) {
          const g = await generate([{ role: "system", content: CHAKRA_SYSTEM_PROMPT }, { role: "user", content: `CONTEXT:\n${items.map((e) => `- ${e.title} [${e.category}, ${e.severity}, ${e.placeName ?? "?"}]`).join("\n")}\nGive a 2-sentence spoken travel briefing${hi ? " in Hindi" : ""}.` }], { maxTokens: 120, timeoutMs: 6000 });
          if (g) reply = g;
        }
      }
      navigate = undefined;
      followUps = ["Who is affected?", "Run a risk scan", "Is my trip safe?"];
      break;
    }
    case "weather": {
      const target = place ?? (await userTripsPlace(session)).place;
      if (!target) { reply = T(hi, "Which city's weather?", "किस शहर का मौसम?"); break; }
      const w = await fetchLiveWeather(target.lat, target.lng);
      const live = !/fallback|simulat|demo/i.test(JSON.stringify(w.provenance ?? {}));
      const adv = w.isMonsoonAlert ? T(hi, "Heavy rain likely — keep indoor backups.", "भारी बारिश की संभावना — इनडोर विकल्प रखें।") : w.temperatureC > 36 ? T(hi, "Very hot — avoid midday outdoor plans.", "बहुत गर्मी — दोपहर में बाहर जाने से बचें।") : T(hi, "Good conditions for sightseeing.", "घूमने के लिए अच्छा मौसम।");
      cards.push({ type: "weather", place: target.name, tempC: w.temperatureC, condition: w.condition, rainChance: w.precipitationProbability, advisory: adv, source: live ? "Open-Meteo live" : "estimate (offline)" });
      reply = T(hi, `${target.name}: ${w.temperatureC}°C, ${w.condition.toLowerCase()}, ${w.precipitationProbability}% chance of rain. ${adv}`, `${target.name}: ${w.temperatureC}°C, बारिश की संभावना ${w.precipitationProbability}%। ${adv}`);
      followUps = [`Packing list for ${target.name}`, `Is ${target.name} safe?`];
      break;
    }
    case "disruption_help": {
      const mine = await userTripsPlace(session);
      const dest = place ?? mine.place;
      const origin = s.origin ?? mine.home;
      if (!dest) { reply = T(hi, "Where are you trying to get to? Say for example 'find another way to Goa from Mumbai'.", "आपको कहाँ पहुँचना है? जैसे — 'मुंबई से गोवा का दूसरा रास्ता बताओ'।"); break; }
      const opts2 = findAlternatives({ origin, destination: dest, disruptedMode: /train|ट्रेन/i.test(text) ? "train" : /bus/i.test(text) ? "bus" : "flight", disruptionCategory: "transport_disruption" });
      cards.push({ type: "routes", from: origin?.name, to: dest.name, options: opts2 });
      const best = opts2[0];
      reply = T(hi, `Best fallback ${origin ? `from ${origin.name} ` : ""}to ${dest.name}: ${best.title}, about ${best.durationHours} hours, ${inr(best.costInr[0])}–${inr(best.costInr[1])}. I've listed ${opts2.length - 1} more options. If your flight was cancelled at short notice you may also be owed compensation.`, `${dest.name} के लिए सबसे अच्छा विकल्प: ${best.title}, लगभग ${best.durationHours} घंटे, ${inr(best.costInr[0])}–${inr(best.costInr[1])}। फ्लाइट रद्द हुई है तो मुआवज़ा भी मिल सकता है।`);
      followUps = ["Am I owed compensation?", `Weather in ${dest.name}`];
      break;
    }
    case "emergency_sos": {
      const target = place ?? (await userTripsPlace(session)).place;
      const dir = getEmergencyDirectory(target?.name ?? "India") as unknown as Record<string, unknown>;
      const intl = target && target.countryCode !== "IN";
      const numbers = intl ? [{ label: "Local emergency (most countries)", number: "112" }, { label: "Indian MEA 24×7 helpline", number: "+91-11-23012113" }] : [{ label: "All emergencies", number: "112" }, { label: "Ambulance", number: "108" }, { label: "Police", number: "100" }, { label: "Women helpline", number: "1091" }, { label: "Tourist helpline", number: "1363" }, { label: "Railway helpline", number: "139" }];
      const d = dir as { hospital?: { name: string; phone?: string }; police?: { name: string; phone?: string } };
      const hospitals = !intl && d.hospital ? [`${d.hospital.name}${d.hospital.phone ? ` · ${d.hospital.phone}` : ""}`, ...(d.police ? [`${d.police.name}${d.police.phone ? ` · ${d.police.phone}` : ""}`] : [])] : [];
      cards.push({ type: "emergency", place: target?.name ?? "your location", numbers, hospitals });
      reply = T(hi, `Call ${numbers[0].number} now if you are in danger. ${intl ? "For passport loss or arrest, call the Indian embassy via the MEA helpline." : "Ambulance is 108, police 100."} Open your offline emergency pass for hospitals near you.`, `ख़तरे में हैं तो अभी ${numbers[0].number} पर कॉल करें। एम्बुलेंस 108, पुलिस 100।`);
      navigate = undefined;
      followUps = ["Share my location", "Nearest hospital"];
      break;
    }
    case "currency_convert": {
      const amount = s.amount ?? 100;
      const from = s.currency ?? "USD";
      const to = s.targetCurrency ?? (from === "INR" ? "USD" : "INR");
      try {
        const fx = await convert(amount, from, to);
        cards.push({ type: "fx", amount, from: fx.from, to: fx.to, result: fx.result, rate: fx.rate, source: fx.source });
        reply = `${amount.toLocaleString("en-IN")} ${fx.from} ≈ ${fx.result.toLocaleString("en-IN")} ${fx.to} (${fx.source} rate).`;
      } catch { reply = T(hi, "I don't support that currency yet.", "यह मुद्रा अभी उपलब्ध नहीं है।"); }
      break;
    }
    case "cost_estimate": {
      const target = place ?? (await userTripsPlace(session)).place;
      if (!target) { reply = "Which destination should I price?"; break; }
      const days = s.days ?? 4, pax = s.travelers ?? 2;
      const c = estimateCost(target, days, pax);
      reply = T(hi, `${days} days in ${target.name} for ${pax} typically costs ${inr(c.min)}–${inr(c.max)} all-in (travel, stay, food, local transport, entries, 10% buffer).${s.budgetInr ? ` Your budget of ${inr(s.budgetInr)} is ${s.budgetInr >= c.min ? "workable" : "tight — consider fewer days or off-season"}.` : ""}`, `${target.name} में ${days} दिन, ${pax} लोगों के लिए लगभग ${inr(c.min)}–${inr(c.max)} खर्च होगा।`);
      cards.push({ type: "plan", destination: target.name, days, total: `${inr(c.min)}–${inr(c.max)}`, highlights: [], href: `/create-trip?destination=${encodeURIComponent(target.name)}&days=${days}` });
      break;
    }
    case "plan_trip": {
      const target = place;
      if (!target) { reply = T(hi, "Where would you like to go?", "आप कहाँ जाना चाहेंगे?"); followUps = ["Plan 4 days in Goa", "Plan 5 days in Kerala"]; break; }
      const days = s.days ?? 3;
      const plan = planTripLocally({ origin: s.origin?.name ?? "Delhi", destination: target.name, days: String(days), budget: s.budgetInr ? String(s.budgetInr) : "Moderate", travelers: `${s.travelers ?? 2} People`, vibe: "Balanced" });
      const highlights = plan.itinerary.flatMap((d) => d.activities.map((a) => a.title)).slice(0, 6);
      const risk = await destinationRisk(target.name);
      const params = new URLSearchParams({ origin: s.origin?.name ?? "Delhi", destination: target.name, days: String(days), budget: s.budgetInr ? String(s.budgetInr) : "Moderate", travelers: `${s.travelers ?? 2} People`, vibe: "Balanced" });
      cards.push({ type: "plan", destination: target.name, days, total: plan.trip_details.total_estimated_cost, highlights, href: `/generate?${params}` });
      reply = T(hi, `Drafted ${days} days in ${target.name}: ${highlights.slice(0, 3).join(", ")}. Estimated ${plan.trip_details.total_estimated_cost.split(" (")[0]}. Current risk there is ${risk.score}/100. Say "open it" or tap the card to save and monitor it.`, `${target.name} के ${days} दिन का प्लान तैयार है: ${highlights.slice(0, 3).join(", ")}। अनुमानित खर्च ${plan.trip_details.total_estimated_cost.split(" (")[0]}।`);
      followUps = [`Is ${target.name} safe?`, `Packing list for ${target.name}`];
      break;
    }
    case "packing_list": {
      const target = place ?? (await userTripsPlace(session)).place;
      let temp: number | undefined, rain: number | undefined;
      if (target) { try { const w = await fetchLiveWeather(target.lat, target.lng); temp = w.temperatureC; rain = w.precipitationProbability; } catch { /* offline */ } }
      const items = packingList(target, s.days ?? 4, temp, rain);
      cards.push({ type: "list", title: `Packing list${target ? ` · ${target.name}` : ""}`, items });
      reply = T(hi, `Here's a packing list${target ? ` for ${target.name}` : ""} with ${items.length} essentials, tuned to the current weather.`, `${target ? `${target.name} के लिए ` : ""}पैकिंग सूची तैयार है।`);
      break;
    }
    case "trip_status": {
      if (!session) { reply = T(hi, "Sign in and I'll track your trips.", "साइन इन करें, मैं आपकी यात्राएँ ट्रैक करूँगा।"); navigate = "/sign-in"; break; }
      const trips = await db.trip.findMany({ where: { ownerId: session.uid }, orderBy: { createdAt: "desc" }, take: 5 });
      const withRisk = await Promise.all(trips.map(async (t) => ({ id: t.id, title: t.title, destination: t.destination, status: t.status, risk: (await destinationRisk(t.destination.split(/->|\|/)[0].trim())).score })));
      cards.push({ type: "trips", trips: withRisk });
      reply = withRisk.length ? T(hi, `You have ${withRisk.length} trip${withRisk.length > 1 ? "s" : ""}. ${withRisk.map((t) => `${t.destination}: risk ${t.risk}/100`).join("; ")}.`, `आपकी ${withRisk.length} यात्राएँ हैं। ${withRisk.map((t) => `${t.destination}: जोखिम ${t.risk}/100`).join("; ")}।`) : T(hi, "No trips yet — want me to plan one?", "अभी कोई यात्रा नहीं — प्लान बनाऊँ?");
      break;
    }
    case "affected_travelers":
    case "traveler_checkin": {
      if (!session) { reply = "Duty-of-care tools need a team account. Sign in first."; navigate = "/sign-in"; break; }
      const where = place;
      const travelers = await db.traveler.findMany({
        where: { orgId: session.oid, tripEnd: { gt: new Date() }, ...(where ? { OR: [{ destinationCity: where.name }, { destLat: { gt: where.lat - 3, lt: where.lat + 3 }, destLng: { gt: where.lng - 3, lt: where.lng + 3 } }] } : { exposureScore: { gt: 0 } }) },
        orderBy: { exposureScore: "desc" }, take: 25,
      });
      if (intent === "affected_travelers") {
        cards.push({ type: "travelers", title: where ? `Travellers near ${where.name}` : "Travellers with active exposure", travelers: travelers.map((t) => ({ id: t.id, name: t.name, destination: t.destinationCity, exposure: t.exposureScore, status: t.safetyStatus })) });
        const unsafe = travelers.filter((t) => t.safetyStatus === "needs_help").length;
        const pending = travelers.filter((t) => t.safetyStatus === "unknown").length;
        const elevated = travelers.filter((t) => t.exposureScore >= 35).length;
        reply = travelers.length ? T(hi, `${elevated} traveller${elevated === 1 ? " is" : "s are"} at elevated risk${where ? ` near ${where.name}` : ""} (${travelers.length} with some exposure). ${unsafe} need help, ${pending} haven't confirmed they're safe yet. Highest: ${travelers[0].name} in ${travelers[0].destinationCity} (${travelers[0].exposureScore}/100).`, `${elevated} यात्री ज़्यादा जोखिम में हैं (${travelers.length} पर कुछ असर)। ${unsafe} को मदद चाहिए, ${pending} ने अभी पुष्टि नहीं की।`) : T(hi, "No travellers are currently exposed.", "अभी कोई यात्री जोखिम में नहीं है।");
        followUps = ["Send a safety check-in to all of them", "Open duty of care"];
      } else {
        if (!["owner", "admin", "agent"].includes(session.role)) { reply = "You need an admin or agent role to send check-ins."; break; }
        const targets = travelers.slice(0, 25);
        let sent = 0;
        for (const t of targets) {
          const task = await db.agentTask.create({ data: { orgId: session.oid, subjectType: "traveler", subjectId: t.id, kind: "checkin", title: `Voice check-in: ${t.name}`, detail: `Requested by ${session.name} via Jarvis`, autonomyLevel: "L2", status: "approved", decidedBy: session.uid, decidedAt: new Date(), idempotencyKey: `voice-${t.id}-${Date.now()}` } });
          const done = await executeTask(task.id, session.uid);
          if (done.status === "executed") sent++;
          await db.traveler.update({ where: { id: t.id }, data: { safetyStatus: t.safetyStatus === "safe" ? "safe" : "unknown" } });
        }
        cards.push({ type: "travelers", title: `Check-ins sent`, travelers: targets.map((t) => ({ id: t.id, name: t.name, destination: t.destinationCity, exposure: t.exposureScore, status: "pending" })) });
        reply = T(hi, `Sent ${sent} safety check-in${sent === 1 ? "" : "s"}${where ? ` to travellers near ${where.name}` : ""}. Each has a one-tap link and WhatsApp message; responses will show up live on the duty-of-care board.`, `${sent} यात्रियों को सुरक्षा संदेश भेज दिए गए हैं। जवाब लाइव दिखेंगे।`);
        navigate = "/duty-of-care";
      }
      break;
    }
    case "run_agent": {
      if (!session) { reply = "Sign in to run the autonomous agent on your trips."; navigate = "/sign-in"; break; }
      const res = await runAgentCycle({ trigger: "voice", orgId: session.oid });
      cards.push({ type: "agent", summary: res.summary, executed: res.executed, proposed: res.proposed, runId: res.runId });
      reply = T(hi, `Scan complete. ${res.exposures} exposures found, ${res.executed} actions taken automatically and ${res.proposed} waiting for your approval.`, `स्कैन पूरा। ${res.exposures} जोखिम मिले, ${res.executed} कार्य अपने-आप किए गए और ${res.proposed} आपकी मंज़ूरी के लिए हैं।`);
      followUps = ["Show the approvals inbox", "Who is affected?"];
      break;
    }
    case "set_autonomy": {
      if (!session) { reply = "Sign in to change the agent's autonomy."; navigate = "/sign-in"; break; }
      if (!["owner", "admin"].includes(session.role)) { reply = "Only owners or admins can change autonomy."; break; }
      const level = (s.autonomyLevel ?? "L2") as AutonomyLevel;
      await db.organization.update({ where: { id: session.oid }, data: { autonomyLevel: level } });
      await db.auditEvent.create({ data: { actor: "USER", actorId: session.uid, entity: "Policy", entityId: session.oid, event: "autonomy_changed", data: JSON.stringify({ level, via: "voice" }) } });
      reply = T(hi, `Autonomy set to ${level} — ${LEVEL_INFO[level].name}. ${LEVEL_INFO[level].description}`, `ऑटोनॉमी ${level} (${LEVEL_INFO[level].name}) पर सेट कर दी गई है।`);
      break;
    }
    case "open_page": {
      navigate = s.page ?? "/command";
      reply = T(hi, "Opening it now.", "खोल रहा हूँ।");
      break;
    }
    case "compensation_claim": {
      const mine = await userTripsPlace(session);
      const dest = place ?? mine.place ?? findPlace("Goa")!;
      const origin = s.origin ?? mine.home ?? findPlace("Delhi")!;
      const kind = /cancel|रद्द/i.test(text) ? "cancellation" : /denied|offload/i.test(text) ? "denied_boarding" : "delay";
      const est = estimateCompensation({ kind, departureCountry: origin.countryCode, arrivalCountry: dest.countryCode, distanceKm: Math.max(150, haversineKm(origin, dest)), delayHoursAtArrival: s.delayHours ?? (kind === "delay" ? 4 : undefined), noticeDays: 0 });
      cards.push({ type: "claim", regime: est.regime, eligible: est.eligible, amount: est.amount, currency: est.currency, entitlements: est.entitlements, reasoning: est.reasoning });
      reply = est.amount ? T(hi, `Under ${est.regime.replace("_", " ")} you may be owed about ${est.currency} ${est.amount.toLocaleString("en-IN")}. I've drafted the claim letter in the Claims centre.`, `${est.regime} के तहत लगभग ${est.currency} ${est.amount.toLocaleString("en-IN")} मुआवज़ा बनता है। क्लेम पत्र तैयार है।`) : T(hi, `No cash compensation is due under ${est.regime.replace("_", " ")} for this case, but you're entitled to: ${est.entitlements.join(" ") || "a refund or alternate travel"}.`, `इस मामले में नकद मुआवज़ा नहीं बनता, लेकिन रिफ़ंड/सुविधाएँ मिलेंगी।`);
      followUps = ["Open claims centre"];
      break;
    }
    case "phrase_translate": {
      const tr = translatePhrase(s.phrase, s.language);
      if (!tr) { reply = `I know ${SUPPORTED_PHRASES.length} essential phrases in 10 languages — try "how do I say thank you in Japanese".`; break; }
      cards.push({ type: "phrase", phrase: tr.phrase, language: tr.language, native: tr.native, roman: tr.roman, voice: tr.voice });
      reply = `In ${tr.language}, "${tr.phrase}" is ${tr.native} — pronounced ${tr.roman}.`;
      voice = tr.voice;
      break;
    }
    case "thanks_bye":
      reply = T(hi, "Anytime. I'll keep watching the world for you — safe travels!", "ज़रूर! मैं आपके लिए दुनिया पर नज़र रखूँगा — शुभ यात्रा!");
      break;
    default: {
      // out of scope: check whether it's actually a news headline someone pasted
      const news = classifyNews(text);
      if (news.relevant && news.categoryConfidence > 0.7 && text.split(" ").length > 5) {
        reply = `That reads like a ${CATEGORY_META[news.category as NewsCategory].label.toLowerCase()} item (${news.severity})${news.primaryPlace ? ` affecting ${news.primaryPlace.name}` : ""}. Want me to check who's exposed?`;
        followUps = ["Who is affected?", "Run a risk scan"];
      } else {
        reply = T(hi, "I'm focused on travel — trips, risks, news, routes and safety. Try “Is Bali safe this week?”", "मैं यात्रा से जुड़े सवालों में मदद करता हूँ — जैसे “क्या बाली इस हफ़्ते सुरक्षित है?”");
        followUps = ["What can you do?"];
      }
    }
  }

  const speak = reply.replace(/₹/g, "rupees ").replace(/\s+/g, " ").replace(/\/100/g, " out of 100");
  const gen = await generativeAvailable();
  return {
    reply, speak, lang: hi ? "hi-IN" : "en-IN", voice, intent, confidence: r.confidence, cards, navigate, followUps,
    model: gen ? `${NANO_INFO.name} + local generative SLM` : NANO_INFO.name, latencyMs: Math.round(performance.now() - t0),
  };
}
