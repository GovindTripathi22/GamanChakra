/**
 * Tier-2 generative SLM: a small open model (Qwen2.5 / Llama 3.2, 1–3B) served LOCALLY by Ollama.
 * No API key, no cloud. If Ollama is not running, every caller falls back to Chakra-Nano + templates,
 * so the product works fully offline either way.
 *
 *   ollama create chakra -f slm/Modelfile     # one-time
 *   OLLAMA_URL=http://localhost:11434 OLLAMA_MODEL=chakra npm run dev
 */

const OLLAMA_URL = () => process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || "chakra";

let health: { ok: boolean; checkedAt: number; models: string[] } = { ok: false, checkedAt: 0, models: [] };

export async function generativeAvailable(): Promise<boolean> {
  if (process.env.GENERATIVE_SLM === "off") return false;
  if (Date.now() - health.checkedAt < 60_000) return health.ok;
  try {
    const r = await fetch(`${OLLAMA_URL()}/api/tags`, { signal: AbortSignal.timeout(800) });
    const j = (await r.json()) as { models?: { name: string }[] };
    const models = (j.models || []).map((m) => m.name);
    const wanted = OLLAMA_MODEL();
    health = { ok: r.ok && models.some((m) => m === wanted || m.startsWith(`${wanted}:`)), checkedAt: Date.now(), models };
  } catch {
    health = { ok: false, checkedAt: Date.now(), models: [] };
  }
  return health.ok;
}

export function generativeStatus() {
  return { url: OLLAMA_URL(), model: OLLAMA_MODEL(), ...health };
}

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

export const CHAKRA_SYSTEM_PROMPT = `You are Chakra, the voice co-pilot inside Voyage, an autonomous travel-risk operating system.
Rules: answer in 1-3 short spoken sentences; never invent facts — use only the CONTEXT provided; if context lacks the answer say so;
prefer concrete actions (rebook, reroute, check in, wait); keep a calm, confident tone; reply in the user's language (English, Hindi or Hinglish).`;

export async function generate(messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number; timeoutMs?: number } = {}): Promise<string | null> {
  if (!(await generativeAvailable())) return null;
  try {
    const r = await fetch(`${OLLAMA_URL()}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
      body: JSON.stringify({
        model: OLLAMA_MODEL(),
        messages,
        stream: false,
        format: opts.json ? "json" : undefined,
        options: { temperature: opts.temperature ?? 0.3, num_predict: opts.maxTokens ?? 220 },
      }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { message?: { content?: string } };
    return j.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function generateJSON<T>(messages: ChatMessage[], opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<T | null> {
  const out = await generate(messages, { ...opts, json: true });
  if (!out) return null;
  try {
    const m = out.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : out) as T;
  } catch {
    return null;
  }
}
