import { XMLParser } from "fast-xml-parser";
import type { RawArticle, SourceConfig } from "./types";
import type { Severity, NewsCategory } from "@/lib/slm/labels";

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", removeNSPrefix: false, processEntities: true, htmlEntities: true });

export function stripHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)["#text"]);
  if (Array.isArray(v)) return text(v[0]);
  return "";
}

function safeDate(v: unknown): Date {
  const d = new Date(text(v));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** GDELT DOC 2.0 ArtList JSON. seendate looks like 20261013T061500Z */
export function parseGdelt(json: unknown, src: SourceConfig): RawArticle[] {
  const arts = (json as { articles?: Record<string, string>[] })?.articles ?? [];
  return arts.filter((a) => a.title && a.url).map((a) => {
    const s = a.seendate || "";
    const iso = s.length >= 15 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z` : "";
    return {
      title: stripHtml(a.title),
      url: a.url,
      source: a.domain || src.name,
      sourceKind: "gdelt" as const,
      publishedAt: iso ? new Date(iso) : new Date(),
      lang: (a.language || "English").toLowerCase().startsWith("eng") ? "en" : a.language,
    };
  });
}

/** USGS GeoJSON summary feed. */
export function parseUsgs(json: unknown): RawArticle[] {
  const feats = (json as { features?: { id: string; properties: Record<string, unknown>; geometry: { coordinates: number[] } }[] })?.features ?? [];
  return feats.map((f) => {
    const p = f.properties;
    const mag = Number(p.mag ?? 0);
    const alert = String(p.alert ?? "");
    const tsunami = Number(p.tsunami ?? 0) === 1;
    let severity: Severity = mag >= 7 ? "critical" : mag >= 6 ? "high" : mag >= 5 ? "moderate" : "low";
    if (alert === "red") severity = "critical";
    else if (alert === "orange" && severity !== "critical") severity = "high";
    const radiusKm = Math.round(Math.min(600, Math.max(60, Math.pow(10, 0.43 * mag - 0.2) * 4)));
    const place = String(p.place ?? "Unknown location");
    return {
      title: `M ${mag.toFixed(1)} earthquake — ${place}${tsunami ? " (tsunami evaluation issued)" : ""}`,
      summary: `USGS reports a magnitude ${mag.toFixed(1)} earthquake ${place}. Depth ${Math.round(f.geometry.coordinates[2] ?? 0)} km.${alert ? ` PAGER alert: ${alert}.` : ""}`,
      url: String(p.url ?? `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`),
      source: "USGS",
      sourceKind: "usgs" as const,
      publishedAt: new Date(Number(p.time ?? Date.now())),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      hint: { category: "natural_disaster" as NewsCategory, severity, radiusKm, tags: ["earthquake", `M${mag.toFixed(1)}`, ...(tsunami ? ["tsunami"] : [])] },
    };
  });
}

const GDACS_TYPES: Record<string, { label: string; category: NewsCategory; radius: number }> = {
  EQ: { label: "earthquake", category: "natural_disaster", radius: 250 },
  TC: { label: "tropical cyclone", category: "natural_disaster", radius: 400 },
  FL: { label: "flood", category: "natural_disaster", radius: 200 },
  VO: { label: "volcano", category: "natural_disaster", radius: 150 },
  DR: { label: "drought", category: "severe_weather", radius: 500 },
  WF: { label: "wildfire", category: "natural_disaster", radius: 120 },
  TS: { label: "tsunami", category: "natural_disaster", radius: 500 },
};

function geoFromItem(it: Record<string, unknown>): { lat?: number; lng?: number } {
  const pt = text(it["georss:point"]) || text((it["geo:Point"] as Record<string, unknown>)?.["geo:lat"] ? `${text((it["geo:Point"] as Record<string, unknown>)["geo:lat"])} ${text((it["geo:Point"] as Record<string, unknown>)["geo:long"])}` : "");
  if (pt) {
    const [a, b] = pt.trim().split(/\s+/).map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lng: b };
  }
  const lat = Number(text(it["geo:lat"])), lng = Number(text(it["geo:long"]));
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return { lat, lng };
  return {};
}

/** RSS 2.0 and Atom (BBC, Al Jazeera, The Hindu, ReliefWeb, Google News, GDACS). */
export function parseRss(body: string, src: SourceConfig): RawArticle[] {
  const doc = xml.parse(body) as Record<string, any>;
  const channel = doc?.rss?.channel ?? doc?.["rdf:RDF"] ?? null;
  let items: Record<string, unknown>[] = [];
  if (channel) items = ([] as Record<string, unknown>[]).concat(channel.item ?? doc?.["rdf:RDF"]?.item ?? []);
  else if (doc?.feed?.entry) items = [].concat(doc.feed.entry);
  return items.map((it) => {
    let title = stripHtml(text(it.title));
    let source = src.name;
    if (src.kind === "google_news") {
      const m = title.match(/^(.*)\s+-\s+([^-]{2,60})$/);
      if (m) { title = m[1].trim(); source = m[2].trim(); }
      const s = text(it.source);
      if (s) source = s;
    }
    const linkRaw = it.link as unknown;
    const url = typeof linkRaw === "object" && linkRaw && "@_href" in (linkRaw as Record<string, unknown>) ? String((linkRaw as Record<string, unknown>)["@_href"]) : text(linkRaw) || text(it.guid) || text(it.id);
    const summary = stripHtml(text(it.description) || text(it.summary) || text(it.content)).slice(0, 500);
    const art: RawArticle = {
      title, summary: src.kind === "google_news" ? "" : summary, url, source, sourceKind: src.kind === "gdacs" ? "gdacs" : src.kind === "google_news" ? "google_news" : "rss",
      publishedAt: safeDate(it.pubDate ?? it.published ?? it.updated ?? it["dc:date"]), lang: "en", ...geoFromItem(it),
    };
    if (src.kind === "gdacs") {
      const type = text(it["gdacs:eventtype"]).toUpperCase();
      const level = text(it["gdacs:alertlevel"]).toLowerCase();
      const meta = GDACS_TYPES[type];
      const severity: Severity = level === "red" ? "critical" : level === "orange" ? "high" : "moderate";
      if (meta) art.hint = { category: meta.category, severity, radiusKm: meta.radius, tags: [meta.label, `GDACS ${level || "green"}`] };
      if (level === "green" && art.hint) art.hint.severity = "low";
    }
    return art;
  }).filter((a) => a.title && a.url);
}
