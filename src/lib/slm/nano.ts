import weights from "./weights/chakra-nano.json";
import { Network, type SerializedNetwork } from "./network";
import { featurize } from "./features";
import { type Intent, type NewsCategory, type Severity, CATEGORY_META } from "./labels";
import { severityEvidence, combineSeverity } from "./severity";
import { extractSlots, type Slots } from "./slots";
import { extractPlaces, type PlaceMatch } from "@/lib/geo/gazetteer";
import { categoryEvidence } from "./lexicon";

let net: Network | null = null;
function model(): Network {
  if (!net) net = Network.load(weights as unknown as SerializedNetwork);
  return net;
}

export const NANO_INFO = {
  name: "chakra-nano",
  version: (weights as unknown as SerializedNetwork).meta?.version ?? "1.0.0",
  get report() { return (weights as unknown as SerializedNetwork).meta?.report as Record<string, unknown> | undefined; },
};

export interface NewsClassification {
  category: NewsCategory;
  categoryConfidence: number;
  severity: Severity;
  severityConfidence: number;
  relevant: boolean;
  places: PlaceMatch[];
  primaryPlace: PlaceMatch | null;
  evidence: string[];
  categoryProbs: Record<string, number>;
  latencyMs: number;
}

export function classifyNews(title: string, summary = ""): NewsClassification {
  const t0 = performance.now();
  const text = `${title}. ${summary}`.slice(0, 600);
  const m = model();
  const ids = featurize(title.length > 20 ? `${title} ${summary.slice(0, 160)}` : text, m.buckets);
  const cat = m.predict("category", ids);
  const sev = m.predict("severity", ids);
  let category = cat.label as NewsCategory;
  // Low-confidence + no travel lexicon evidence => treat as general news (avoid false alarms)
  const lex = categoryEvidence(text);
  const travelLex = Object.keys(lex).filter((k) => k !== "not_travel");
  if (category !== "not_travel" && cat.prob < 0.35 && travelLex.length === 0) category = "not_travel";
  const ev = severityEvidence(text, category);
  const severity = combineSeverity(sev.label as Severity, ev);
  const places = extractPlaces(title).concat(extractPlaces(summary.slice(0, 300))).filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
  const primaryPlace = places.find((p) => p.kind !== "country") ?? places[0] ?? null;
  return {
    category,
    categoryConfidence: +cat.prob.toFixed(3),
    severity,
    severityConfidence: +sev.prob.toFixed(3),
    relevant: category !== "not_travel" && CATEGORY_META[category].weight > 0,
    places,
    primaryPlace,
    evidence: [...ev.reasons, ...travelLex.slice(0, 3).map((k) => `${k.replace("_", " ")} cues: ${lex[k].slice(0, 3).join(", ")}`)],
    categoryProbs: cat.probs,
    latencyMs: +(performance.now() - t0).toFixed(3),
  };
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  alternatives: { intent: Intent; confidence: number }[];
  slots: Slots;
  latencyMs: number;
}

export function classifyIntent(text: string): IntentResult {
  const t0 = performance.now();
  const m = model();
  const p = m.predict("intent", featurize(text, m.buckets));
  const alternatives = Object.entries(p.probs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([intent, confidence]) => ({ intent: intent as Intent, confidence: +confidence.toFixed(3) }));
  let intent = p.label as Intent;
  const slots = extractSlots(text);
  // Light, explainable post-rules for commands that carry unmistakable structure
  if (slots.amount && slots.currency && slots.targetCurrency && /convert|kitne|how much is|in (inr|rupees|usd|dollars)|exchange/i.test(text)) intent = "currency_convert";
  if (/^(sos|emergency|help!+|bachao)$/i.test(text.trim())) intent = "emergency_sos";
  return { intent, confidence: +p.prob.toFixed(3), alternatives, slots, latencyMs: +(performance.now() - t0).toFixed(3) };
}
