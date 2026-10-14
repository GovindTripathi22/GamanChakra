import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { classifyNews } from "@/lib/slm/nano";
import { CATEGORY_META, type NewsCategory, type Severity } from "@/lib/slm/labels";
import { nearestCity, countryByCode, normalizeText } from "@/lib/geo/gazetteer";
import { parseGdelt, parseRss, parseUsgs } from "./parsers";
import { getSources, destinationWatchSource } from "./sources";
import { drillArticles } from "./sample-feed";
import { impactScore } from "./scoring";
import { publish } from "@/lib/events/bus";
import type { NormalizedEvent, RawArticle, SourceConfig, SourceStatus } from "./types";

const UA = "Voyage/3.0 (+https://voyage.app; travel-risk monitor)";

export async function fetchSource(src: SourceConfig, timeoutMs = 9000): Promise<{ items: RawArticle[]; status: SourceStatus }> {
  const t0 = Date.now();
  try {
    const res = await fetch(src.url, { headers: { "user-agent": UA, accept: "application/json, application/rss+xml, application/xml, text/xml, */*" }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    let items: RawArticle[] = [];
    if (src.kind === "gdelt") items = parseGdelt(JSON.parse(body), src);
    else if (src.kind === "usgs") items = parseUsgs(JSON.parse(body));
    else items = parseRss(body, src);
    return { items, status: { id: src.id, name: src.name, ok: true, items: items.length, ms: Date.now() - t0 } };
  } catch (e) {
    return { items: [], status: { id: src.id, name: src.name, ok: false, items: 0, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) } };
  }
}

export function fingerprint(title: string): string {
  const toks = normalizeText(title.replace(/^drill:\s*/i, "")).split(" ").filter((t) => t.length > 2).slice(0, 14).sort();
  return createHash("sha1").update(toks.join(" ")).digest("hex").slice(0, 24);
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeText(s).split(" ").filter((t) => t.length > 3));
}
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Normalise + classify + geotag + score a raw article. Returns null for items too old or empty. */
export function normalizeArticle(a: RawArticle, reliability = 0.8, now = new Date()): NormalizedEvent | null {
  const title = a.title.replace(/\s+/g, " ").trim();
  if (title.length < 12) return null;
  if (now.getTime() - a.publishedAt.getTime() > 5 * 864e5) return null; // older than 5 days: not "real-time"
  const cls = classifyNews(title, a.summary ?? "");
  let category: NewsCategory = cls.category;
  let severity: Severity = cls.severity;
  let confidence = cls.categoryConfidence;
  if (a.hint?.category) { category = a.hint.category; confidence = Math.max(confidence, 0.95); }
  if (a.hint?.severity) severity = a.hint.severity;

  let lat: number | null = a.lat ?? null, lng: number | null = a.lng ?? null;
  let placeName: string | null = null, countryCode: string | null = null;
  if (lat != null && lng != null) {
    const city = nearestCity(lat, lng, 350);
    placeName = city ? city.name : null;
    countryCode = city?.countryCode ?? cls.primaryPlace?.countryCode ?? null;
    if (!placeName && cls.primaryPlace) { placeName = cls.primaryPlace.name; countryCode = cls.primaryPlace.countryCode; }
  } else if (cls.primaryPlace) {
    lat = cls.primaryPlace.lat; lng = cls.primaryPlace.lng;
    placeName = cls.primaryPlace.name; countryCode = cls.primaryPlace.countryCode;
  }
  const meta = CATEGORY_META[category];
  let radiusKm = a.hint?.radiusKm ?? meta.defaultRadiusKm;
  if (cls.primaryPlace?.kind === "country") radiusKm = Math.max(radiusKm, Math.min(cls.primaryPlace.radiusKm, 900));
  if (countryCode && !placeName) placeName = countryByCode(countryCode)?.name ?? null;

  const score = impactScore({ category, severity, confidence, publishedAt: a.publishedAt, hasGeo: lat != null, reliability, now });
  return {
    fingerprint: fingerprint(title),
    title,
    summary: (a.summary ?? "").slice(0, 400),
    url: a.url,
    source: a.source,
    sourceKind: a.sourceKind,
    publishedAt: a.publishedAt,
    lang: a.lang ?? "en",
    category,
    severity,
    confidence: +confidence.toFixed(3),
    impactScore: score,
    placeName,
    countryCode,
    lat,
    lng,
    radiusKm,
    tags: [...new Set([...(a.hint?.tags ?? []), meta.label])],
    provenance: a.sourceKind === "sample" ? "sample" : "live",
    evidence: cls.evidence,
  };
}

/** Collapse near-duplicates (same story from several outlets) keeping the most reliable/earliest. */
export function dedupe(events: NormalizedEvent[], existingTitles: string[] = []): NormalizedEvent[] {
  const kept: { e: NormalizedEvent; set: Set<string> }[] = [];
  const existing = existingTitles.map(tokenSet);
  const seen = new Set<string>();
  for (const e of events.sort((a, b) => b.impactScore - a.impactScore || a.publishedAt.getTime() - b.publishedAt.getTime())) {
    if (seen.has(e.fingerprint)) continue;
    const set = tokenSet(e.title);
    if (existing.some((x) => jaccard(x, set) >= 0.6)) continue;
    if (kept.some((k) => jaccard(k.set, set) >= 0.6)) continue;
    seen.add(e.fingerprint);
    kept.push({ e, set });
  }
  return kept.map((k) => k.e);
}

export interface IngestResult {
  fetched: number;
  normalized: number;
  relevant: number;
  inserted: number;
  duplicates: number;
  mode: "live" | "drill" | "live+drill";
  sources: SourceStatus[];
  topEvents: { id: string; title: string; category: string; severity: string; impactScore: number; placeName: string | null }[];
  ms: number;
}

/**
 * The full real-time ingestion cycle: fetch every keyless source in parallel → normalise →
 * classify with Chakra-Nano → geotag → score → dedupe → persist → publish on the event bus.
 */
export async function ingestNews(opts: { watchCities?: string[]; mode?: "auto" | "live" | "drill"; now?: Date } = {}): Promise<IngestResult> {
  const t0 = Date.now();
  const now = opts.now ?? new Date();
  const mode = opts.mode ?? ((process.env.NEWS_MODE as "auto" | "live" | "drill") || "auto");
  const sources = getSources();
  for (const c of (opts.watchCities ?? []).slice(0, 8)) sources.push(destinationWatchSource(c));

  let raws: { a: RawArticle; rel: number }[] = [];
  const statuses: SourceStatus[] = [];
  if (mode !== "drill") {
    const results = await Promise.all(sources.map((s) => fetchSource(s)));
    results.forEach((r, i) => { statuses.push(r.status); for (const a of r.items) raws.push({ a, rel: sources[i].reliability }); });
  }
  const liveCount = raws.length;
  let usedDrill = false;
  if (mode === "drill" || (mode === "auto" && liveCount === 0)) {
    const existingLive = await db.newsEvent.count({ where: { provenance: "live", publishedAt: { gt: new Date(now.getTime() - 864e5) } } });
    if (mode === "drill" || existingLive === 0) {
      raws = raws.concat(drillArticles(now).map((a) => ({ a, rel: 0.9 })));
      usedDrill = true;
      statuses.push({ id: "drill", name: "Drill feed (offline simulation)", ok: true, items: drillArticles(now).length, ms: 0 });
    }
  }

  const normalized = raws.map(({ a, rel }) => normalizeArticle(a, rel, now)).filter((x): x is NormalizedEvent => !!x);
  const relevant = normalized.filter((e) => e.category !== "not_travel");
  const recent = await db.newsEvent.findMany({ where: { ingestedAt: { gt: new Date(now.getTime() - 2 * 864e5) } }, select: { title: true, fingerprint: true }, take: 800, orderBy: { ingestedAt: "desc" } });
  const knownFp = new Set(recent.map((r) => r.fingerprint));
  const fresh = dedupe(relevant.filter((e) => !knownFp.has(e.fingerprint)), recent.map((r) => r.title));

  let inserted = 0;
  const created: { id: string; title: string; category: string; severity: string; impactScore: number; placeName: string | null }[] = [];
  for (const e of fresh) {
    try {
      const row = await db.newsEvent.create({
        data: {
          fingerprint: e.fingerprint, title: e.title, summary: e.summary, url: e.url, source: e.source, sourceKind: e.sourceKind,
          publishedAt: e.publishedAt, lang: e.lang, category: e.category, severity: e.severity, confidence: e.confidence,
          impactScore: e.impactScore, placeName: e.placeName, countryCode: e.countryCode, lat: e.lat, lng: e.lng, radiusKm: e.radiusKm,
          tags: JSON.stringify(e.tags), provenance: e.provenance,
        },
      });
      inserted++;
      created.push({ id: row.id, title: row.title, category: row.category, severity: row.severity, impactScore: row.impactScore, placeName: row.placeName });
    } catch {
      /* unique fingerprint race: another worker inserted it */
    }
  }
  const retentionDays = Number(process.env.NEWS_RETENTION_DAYS || 14);
  await db.newsEvent.deleteMany({ where: { publishedAt: { lt: new Date(now.getTime() - retentionDays * 864e5) } } }).catch(() => {});

  const topEvents = created.sort((a, b) => b.impactScore - a.impactScore).slice(0, 10);
  const result: IngestResult = {
    fetched: raws.length, normalized: normalized.length, relevant: relevant.length, inserted,
    duplicates: relevant.length - inserted, mode: usedDrill ? (liveCount ? "live+drill" : "drill") : "live",
    sources: statuses, topEvents, ms: Date.now() - t0,
  };
  await publish("news.ingested", { inserted, fetched: raws.length, mode: result.mode, top: topEvents.slice(0, 5) });
  for (const ev of topEvents.filter((x) => x.impactScore >= 40).slice(0, 5)) await publish("news.event", ev);
  return result;
}
