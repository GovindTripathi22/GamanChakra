import type { NewsCategory, Severity } from "./labels";
import { SEVERITIES } from "./labels";

/**
 * Deterministic severity evidence extracted from text. Combined with the neural severity head:
 * rules can raise severity when hard evidence exists (M7 quake, "red alert", 100+ dead) and
 * lower it for explicitly benign phrasing ("no damage", "under control").
 */
export interface SeverityEvidence { floor: Severity | null; ceiling: Severity | null; reasons: string[]; magnitude?: number; deaths?: number }

const num = (s: string) => Number(s.replace(/,/g, ""));

export function severityEvidence(text: string, category: NewsCategory): SeverityEvidence {
  const t = text.toLowerCase();
  const reasons: string[] = [];
  let floor: Severity | null = null;
  let ceiling: Severity | null = null;
  const raise = (s: Severity, why: string) => {
    if (!floor || SEVERITIES.indexOf(s) > SEVERITIES.indexOf(floor)) floor = s;
    reasons.push(why);
  };

  let magnitude: number | undefined;
  const mag = t.match(/(?:magnitude|\bm)\s*[-:]?\s*(\d(?:\.\d)?)/) || t.match(/(\d\.\d)\s*(?:-magnitude|magnitude)?\s*(?:quake|earthquake)/);
  if (mag && /quake|tremor|seismic|usgs/.test(t)) {
    magnitude = Number(mag[1]);
    if (magnitude >= 7) raise("critical", `magnitude ${magnitude}`);
    else if (magnitude >= 6) raise("high", `magnitude ${magnitude}`);
    else if (magnitude >= 5) raise("moderate", `magnitude ${magnitude}`);
    else ceiling = "moderate";
  }

  let deaths: number | undefined;
  const d = t.match(/(\d[\d,]*)\s+(?:people\s+)?(?:dead|killed|deaths|died|fatalities|lives)/) || t.match(/death toll (?:rises |climbs |crosses |reaches )?(?:to )?(\d[\d,]*)/);
  if (d) {
    deaths = num(d[1]);
    if (deaths >= 50) raise("critical", `${deaths} deaths`);
    else if (deaths >= 5) raise("high", `${deaths} deaths`);
    else if (deaths >= 1) raise("moderate", `${deaths} deaths`);
  }
  if (/\b(hundreds|thousands|scores) (?:feared )?(?:dead|killed)/.test(t)) raise("critical", "mass casualties");

  if (/red alert|state of emergency|national emergency|do[- ]not[- ]travel|leave immediately|airspace (?:is )?closed|tsunami warning|curfew/.test(t)) raise("high", "official red-level signal");
  if (/super cyclone|category [45]|tsunami|coup|missile|airstrike|rockets? fired|bankrupt|collapses?,? (?:all|thousands)/.test(t)) raise("critical", "catastrophic-class event");
  if (/orange alert|evacuat|stranded|suspended|shut|closed|grounded|cancel/.test(t) && category !== "not_travel") raise("moderate", "operational impact");
  if (/(\d[\d,]*)\s+flights? (?:cancel|delay|divert)/.test(t)) {
    const n = num(t.match(/(\d[\d,]*)\s+flights?/)![1]);
    if (n >= 100) raise("high", `${n} flights affected`);
  }
  if (/no (?:damage|casualties|injuries)|under control|minor|mild|light tremor|pleasant|resume[sd]?|restored|reopens?/.test(t)) {
    ceiling = "moderate";
    reasons.push("benign qualifier");
  }
  if (category === "travel_opportunity" || category === "not_travel") ceiling = "low";
  return { floor, ceiling, reasons, magnitude, deaths };
}

export function combineSeverity(model: Severity, ev: SeverityEvidence): Severity {
  let idx = SEVERITIES.indexOf(model);
  if (ev.floor) idx = Math.max(idx, SEVERITIES.indexOf(ev.floor));
  if (ev.ceiling) idx = Math.min(idx, SEVERITIES.indexOf(ev.ceiling));
  return SEVERITIES[idx];
}
