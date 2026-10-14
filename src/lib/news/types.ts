import type { NewsCategory, Severity } from "@/lib/slm/labels";

export type SourceKind = "gdelt" | "rss" | "google_news" | "usgs" | "gdacs" | "sample";

export interface RawArticle {
  title: string;
  summary?: string;
  url: string;
  source: string;
  sourceKind: SourceKind;
  publishedAt: Date;
  lang?: string;
  lat?: number;
  lng?: number;
  /** Structured feeds (USGS, GDACS) know the category/severity for certain. */
  hint?: { category?: NewsCategory; severity?: Severity; radiusKm?: number; tags?: string[] };
}

export interface NormalizedEvent {
  fingerprint: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceKind: SourceKind;
  publishedAt: Date;
  lang: string;
  category: NewsCategory;
  severity: Severity;
  confidence: number;
  impactScore: number;
  placeName: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  tags: string[];
  provenance: "live" | "sample";
  evidence: string[];
}

export interface SourceConfig {
  id: string;
  name: string;
  kind: SourceKind;
  url: string;
  region?: string;
  reliability: number; // 0..1
  enabled?: boolean;
}

export interface SourceStatus {
  id: string;
  name: string;
  ok: boolean;
  items: number;
  ms: number;
  error?: string;
}
