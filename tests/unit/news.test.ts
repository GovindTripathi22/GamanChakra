import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseGdelt, parseRss, parseUsgs, stripHtml } from "@/lib/news/parsers";
import { normalizeArticle, dedupe, fingerprint, jaccard } from "@/lib/news/pipeline";
import { drillArticles } from "@/lib/news/sample-feed";
import type { SourceConfig } from "@/lib/news/types";

const fx = (f: string) => fs.readFileSync(path.join(__dirname, "../fixtures", f), "utf8");
const NOW = new Date("2026-10-13T06:00:00Z");
const src = (kind: SourceConfig["kind"], name = "Test"): SourceConfig => ({ id: "t", name, kind, url: "https://x", reliability: 0.8 });

describe("source parsers (recorded real-format fixtures)", () => {
  it("GDELT ArtList JSON", () => {
    const a = parseGdelt(JSON.parse(fx("gdelt.json")), src("gdelt"));
    expect(a).toHaveLength(3);
    expect(a[0].publishedAt.toISOString()).toBe("2026-10-13T05:15:00.000Z");
    expect(a[0].source).toBe("example-news.in");
  });
  it("USGS GeoJSON with severity from magnitude + PAGER alert", () => {
    const a = parseUsgs(JSON.parse(fx("usgs.geojson")));
    expect(a[0].hint?.severity).toBe("high");
    expect(a[0].lat).toBeCloseTo(27.95);
    expect(a[1].hint?.severity).toBe("low");
    expect(a[0].hint?.radiusKm).toBeGreaterThan(100);
  });
  it("GDACS RSS with alert level, event type and geo:Point / georss", () => {
    const a = parseRss(fx("gdacs.xml"), src("gdacs", "GDACS"));
    expect(a[0].hint).toMatchObject({ category: "natural_disaster", severity: "critical" });
    expect(a[0].lat).toBeCloseTo(19.9);
    expect(a[1].hint?.severity).toBe("low");
    expect(a[1].lng).toBeCloseTo(36.82);
  });
  it("Google News RSS splits the outlet from the title", () => {
    const a = parseRss(fx("googlenews.xml"), src("google_news"));
    expect(a[0].title).toBe("Transport unions call 24-hour bandh in Bengaluru, cabs to stay off roads");
    expect(a[0].source).toBe("The Hindu");
  });
  it("RSS with CDATA and Atom feeds", () => {
    expect(parseRss(fx("bbc.xml"), src("rss", "BBC"))[0].title).toMatch(/^Paris metro/);
    const atom = parseRss(fx("atom.xml"), src("rss"));
    expect(atom[0].url).toBe("https://example.org/goa-dengue");
    expect(atom[0].summary).toMatch(/repellent/);
  });
  it("strips HTML and entities", () => expect(stripHtml("<b>Hi</b> &amp; <i>bye</i>")).toBe("Hi & bye"));
});

describe("normalisation, scoring and de-duplication", () => {
  it("classifies, geotags and scores", () => {
    const [a] = parseGdelt(JSON.parse(fx("gdelt.json")), src("gdelt"));
    const e = normalizeArticle(a, 0.8, NOW)!;
    expect(e.category).toBe("transport_disruption");
    expect(e.placeName).toBe("Delhi");
    expect(e.impactScore).toBeGreaterThan(30);
  });
  it("structured hints override the model (USGS)", () => {
    const e = normalizeArticle(parseUsgs(JSON.parse(fx("usgs.geojson")))[0], 0.99, NOW)!;
    expect(e.category).toBe("natural_disaster");
    expect(e.placeName).toBe("Kathmandu");
  });
  it("irrelevant news scores zero", () => {
    const e = normalizeArticle(parseGdelt(JSON.parse(fx("gdelt.json")), src("gdelt"))[2], 0.8, NOW)!;
    expect(e.category).toBe("not_travel");
    expect(e.impactScore).toBe(0);
  });
  it("rejects stale (>5 day) articles", () => {
    expect(normalizeArticle({ title: "Floods hit Kochi city again today", url: "u", source: "s", sourceKind: "rss", publishedAt: new Date("2026-09-01") }, 0.8, NOW)).toBeNull();
  });
  it("collapses the same story from different outlets", () => {
    const arts = parseGdelt(JSON.parse(fx("gdelt.json")), src("gdelt")).slice(0, 2).map((a) => normalizeArticle(a, 0.8, NOW)!);
    expect(dedupe(arts)).toHaveLength(1);
  });
  it("fingerprint ignores word order and the Drill prefix", () => {
    expect(fingerprint("Drill: Fog hits Delhi airport")).toBe(fingerprint("Delhi airport fog hits"));
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });
  it("drill feed is clearly labelled", () => {
    for (const d of drillArticles(NOW)) { expect(d.title.startsWith("Drill:")).toBe(true); expect(d.sourceKind).toBe("sample"); }
  });
});
