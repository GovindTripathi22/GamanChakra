import { Network, mulberry32, type SerializedNetwork } from "./network";
import { featurize } from "./features";
import { INTENTS, NEWS_CATEGORIES, SEVERITIES } from "./labels";
import { NEWS_TEMPLATES, NEWS_HANDWRITTEN } from "./corpus/news-corpus";
import { INTENT_TEMPLATES } from "./corpus/intent-corpus";
import { NEWS_EVAL, INTENT_EVAL, NEWS_EVAL_BLIND, INTENT_EVAL_BLIND } from "./corpus/eval-set";
import { expandMany } from "./corpus/fillers";

export const NANO_CONFIG = { buckets: 1 << 14, dim: 32 };

interface Example { text: string; targets: Record<string, number> }

const PREFIXES = ["", "", "", "BREAKING: ", "Live updates: ", "Update: ", "Explained: "];
const SUFFIXES = ["", "", "", " - The Hindu", " | Reuters", " - NDTV", " - BBC News", " - Times of India", " | AP"];

function augment(text: string, rnd: () => number, kind: "news" | "intent"): string {
  let t = text;
  if (kind === "news") t = PREFIXES[Math.floor(rnd() * PREFIXES.length)] + t + SUFFIXES[Math.floor(rnd() * SUFFIXES.length)];
  if (kind === "intent") {
    if (rnd() < 0.15) t = "hey chakra " + t;
    if (rnd() < 0.1) t = t + " please";
  }
  // word dropout (keeps the model from leaning on one token)
  const words = t.split(" ");
  if (words.length > 4 && rnd() < 0.3) words.splice(Math.floor(rnd() * words.length), 1);
  t = words.join(" ");
  const r = rnd();
  if (r < 0.2) t = t.toLowerCase();
  return t;
}

export function buildTrainingSet(seed = 7, includeDevSet = false): Example[] {
  const rnd = mulberry32(seed);
  const out: Example[] = [];
  NEWS_TEMPLATES.forEach(([cat, sev, tpl], i) => {
    for (const text of expandMany(tpl, 7, seed * 1000 + i)) {
      out.push({ text: augment(text, rnd, "news"), targets: { category: NEWS_CATEGORIES.indexOf(cat), severity: SEVERITIES.indexOf(sev) } });
      out.push({ text, targets: { category: NEWS_CATEGORIES.indexOf(cat), severity: SEVERITIES.indexOf(sev) } });
    }
  });
  for (const [cat, sev, text] of NEWS_HANDWRITTEN) {
    for (let k = 0; k < 3; k++) out.push({ text: augment(text, rnd, "news"), targets: { category: NEWS_CATEGORIES.indexOf(cat), severity: SEVERITIES.indexOf(sev) } });
  }
  (Object.entries(INTENT_TEMPLATES) as [string, string[]][]).forEach(([intent, tpls], i) => {
    tpls.forEach((tpl, j) => {
      for (const text of expandMany(tpl, 6, seed * 7000 + i * 100 + j)) {
        out.push({ text: augment(text, rnd, "intent"), targets: { intent: INTENTS.indexOf(intent as never) } });
        out.push({ text, targets: { intent: INTENTS.indexOf(intent as never) } });
      }
    });
  });
  if (includeDevSet) {
    // Final production model also learns from the dev set (v1). The BLIND set is never trained on.
    for (const [cat, sev, text] of NEWS_EVAL) for (let k = 0; k < 2; k++) out.push({ text: k ? augment(text, rnd, "news") : text, targets: { category: NEWS_CATEGORIES.indexOf(cat), severity: SEVERITIES.indexOf(sev) } });
    for (const [intent, text] of INTENT_EVAL) for (let k = 0; k < 2; k++) out.push({ text: k ? augment(text, rnd, "intent") : text, targets: { intent: INTENTS.indexOf(intent) } });
  }
  // shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface TrainReport {
  examples: number;
  epochs: number;
  finalLoss: number;
  params: number;
  eval: {
    intentAccuracy: number;
    categoryAccuracy: number;
    severityAccuracy: number;
    severityWithinOne: number;
    intentErrors: string[];
    categoryErrors: string[];
    perCategory: Record<string, { tp: number; fp: number; fn: number; f1: number }>;
  };
  blind: { intentAccuracy: number; categoryAccuracy: number; severityWithinOne: number; travelRelevanceAccuracy: number; n: number };
  trainedAt: string;
}

export function trainChakraNano(opts: { epochs?: number; lr?: number; seed?: number; includeDevSet?: boolean; log?: (s: string) => void } = {}): { net: Network; serialized: SerializedNetwork; report: TrainReport } {
  const epochs = opts.epochs ?? 18;
  const lr0 = opts.lr ?? 0.35;
  const seed = opts.seed ?? 7;
  const log = opts.log ?? (() => {});
  const data = buildTrainingSet(seed, opts.includeDevSet ?? false);
  const net = new Network(NANO_CONFIG, [
    { name: "intent", labels: INTENTS },
    { name: "category", labels: NEWS_CATEGORIES },
    { name: "severity", labels: SEVERITIES },
  ], seed);
  const feats = data.map((e) => featurize(e.text, NANO_CONFIG.buckets));
  const used = new Set<number>();
  for (const f of feats) for (const id of f) used.add(id);
  const total = epochs * data.length;
  let step = 0;
  let lastLoss = 0;
  const rnd = mulberry32(seed + 1);
  const order = data.map((_, i) => i);
  for (let ep = 0; ep < epochs; ep++) {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let loss = 0;
    for (const idx of order) {
      const lr = lr0 * Math.max(0.02, 1 - step / total);
      loss += net.trainStep(feats[idx], data[idx].targets, lr);
      step++;
    }
    lastLoss = loss / data.length;
    log(`epoch ${ep + 1}/${epochs} loss=${lastLoss.toFixed(4)}`);
  }
  const report: TrainReport = {
    examples: data.length,
    epochs,
    finalLoss: +lastLoss.toFixed(4),
    params: NANO_CONFIG.buckets * NANO_CONFIG.dim + NANO_CONFIG.dim * (INTENTS.length + NEWS_CATEGORIES.length + SEVERITIES.length),
    eval: evaluate(net),
    blind: evaluateBlind(net),
    trainedAt: new Date().toISOString(),
  };
  const serialized = net.export(used, { name: "chakra-nano", version: "1.0.0", report });
  return { net, serialized, report };
}

export function evaluate(net: Network): TrainReport["eval"] {
  let ic = 0, cc = 0, sc = 0, s1 = 0;
  const intentErrors: string[] = [];
  const categoryErrors: string[] = [];
  const per: Record<string, { tp: number; fp: number; fn: number; f1: number }> = {};
  for (const c of NEWS_CATEGORIES) per[c] = { tp: 0, fp: 0, fn: 0, f1: 0 };
  for (const [intent, text] of INTENT_EVAL) {
    const p = net.predict("intent", featurize(text, net.buckets));
    if (p.label === intent) ic++; else intentErrors.push(`${text} → ${p.label} (want ${intent})`);
  }
  for (const [cat, sev, text] of NEWS_EVAL) {
    const ids = featurize(text, net.buckets);
    const p = net.predict("category", ids);
    if (p.label === cat) { cc++; per[cat].tp++; } else { categoryErrors.push(`${text} → ${p.label} (want ${cat})`); per[cat].fn++; per[p.label].fp++; }
    const s = net.predict("severity", ids);
    if (s.label === sev) sc++;
    if (Math.abs(SEVERITIES.indexOf(s.label as never) - SEVERITIES.indexOf(sev)) <= 1) s1++;
  }
  for (const c of NEWS_CATEGORIES) {
    const { tp, fp, fn } = per[c];
    const p = tp / Math.max(1, tp + fp), r = tp / Math.max(1, tp + fn);
    per[c].f1 = +(p + r === 0 ? 0 : (2 * p * r) / (p + r)).toFixed(3);
  }
  return {
    intentAccuracy: +(ic / INTENT_EVAL.length).toFixed(4),
    categoryAccuracy: +(cc / NEWS_EVAL.length).toFixed(4),
    severityAccuracy: +(sc / NEWS_EVAL.length).toFixed(4),
    severityWithinOne: +(s1 / NEWS_EVAL.length).toFixed(4),
    intentErrors,
    categoryErrors,
    perCategory: per,
  };
}

export function evaluateBlind(net: Network): TrainReport["blind"] {
  let ic = 0, cc = 0, s1 = 0, rel = 0;
  for (const [intent, text] of INTENT_EVAL_BLIND) if (net.predict("intent", featurize(text, net.buckets)).label === intent) ic++;
  for (const [cat, sev, text] of NEWS_EVAL_BLIND) {
    const ids = featurize(text, net.buckets);
    const p = net.predict("category", ids).label;
    if (p === cat) cc++;
    if ((p === "not_travel") === (cat === "not_travel")) rel++;
    const s = net.predict("severity", ids).label;
    if (Math.abs(SEVERITIES.indexOf(s as never) - SEVERITIES.indexOf(sev)) <= 1) s1++;
  }
  return {
    intentAccuracy: +(ic / INTENT_EVAL_BLIND.length).toFixed(4),
    categoryAccuracy: +(cc / NEWS_EVAL_BLIND.length).toFixed(4),
    severityWithinOne: +(s1 / NEWS_EVAL_BLIND.length).toFixed(4),
    travelRelevanceAccuracy: +(rel / NEWS_EVAL_BLIND.length).toFixed(4),
    n: INTENT_EVAL_BLIND.length + NEWS_EVAL_BLIND.length,
  };
}
