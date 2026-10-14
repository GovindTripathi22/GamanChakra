import { extractPlaces, normalizeText } from "@/lib/geo/gazetteer";
import { lexiconFeatures } from "./lexicon";

/**
 * Chakra-Nano featurizer.
 * 1. Entity masking: places -> "zplace", numbers -> "znum" (the gazetteer handles *where*, the model learns *what*).
 * 2. Word unigrams + bigrams + boundary-marked character trigrams (typo/morphology robustness, Hinglish friendly).
 * 3. FNV-1a hashing into a fixed number of buckets (the "hashing trick"), so the vocabulary is open.
 */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function maskEntities(text: string): string {
  let out = text;
  const places = extractPlaces(text);
  // replace longest matches first so substrings do not clash
  for (const p of [...places].sort((a, b) => b.matched.length - a.matched.length)) {
    out = out.split(p.matched).join(" zplace ");
  }
  return out.replace(/\d+([.,]\d+)?/g, " znum ");
}

export function tokenize(text: string): string[] {
  return normalizeText(maskEntities(text)).split(" ").filter(Boolean);
}

export function featureStrings(text: string): string[] {
  const toks = tokenize(text);
  const feats: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    feats.push(`w:${w}`);
    if (i + 1 < toks.length) feats.push(`b:${w}_${toks[i + 1]}`);
    if (w.length > 3 && w !== "zplace" && w !== "znum") {
      const padded = `<${w}>`;
      for (let j = 0; j + 3 <= padded.length; j++) feats.push(`c:${padded.slice(j, j + 3)}`);
    }
  }
  for (const lf of lexiconFeatures(toks, text.toLowerCase())) feats.push(lf, lf + "#2");
  if (feats.length === 0) feats.push("w:__empty__");
  return feats;
}

export function featurize(text: string, buckets: number): Int32Array {
  const set = new Set<number>();
  for (const f of featureStrings(text)) set.add(fnv1a(f) % buckets);
  return Int32Array.from(set);
}
