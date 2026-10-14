import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { jarvisRespond } from "@/lib/jarvis/brain";

export const dynamic = "force-dynamic";
const Body = z.object({ text: z.string().trim().min(1).max(500), lang: z.string().max(10).optional(), page: z.string().max(200).optional() });

/** POST /api/jarvis — voice/text command → Chakra-Nano intent + slots → tools → spoken answer + UI cards */
export const POST = handler(async (req, { session }) => {
  const b = Body.parse(await readJson(req));
  try {
    return json(await jarvisRespond(b.text, { session, lang: b.lang, currentPage: b.page }));
  } catch (e) {
    // The voice assistant must always answer — degrade to a helpful reply instead of a 500.
    console.warn("[jarvis] tool failure:", e instanceof Error ? e.message : e);
    const hi = b.lang?.startsWith("hi") || /[\u0900-\u097F]/.test(b.text);
    const reply = hi ? "माफ़ कीजिए, यह जानकारी अभी नहीं मिल पाई। कृपया थोड़ी देर बाद फिर पूछें।" : "Sorry — I couldn't complete that just now. Please try again in a moment, or ask me something else.";
    return json({ reply, speak: reply, lang: hi ? "hi-IN" : "en-IN", intent: "error", confidence: 0, cards: [], followUps: ["What can you do?", "Is my trip safe?"], model: "chakra-nano", latencyMs: 0 });
  }
}, { limit: "jarvis" });
