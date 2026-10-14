/**
 * Export a supervised fine-tuning dataset (chat JSONL) for the generative Chakra SLM.
 *   npm run slm:export-sft   ->  slm/data/sft.jsonl
 * Each record teaches the small model GamanChakra's tasks in the exact JSON contract the app uses.
 */
import fs from "node:fs";
import { NEWS_TEMPLATES, NEWS_HANDWRITTEN } from "../src/lib/slm/corpus/news-corpus";
import { INTENT_TEMPLATES } from "../src/lib/slm/corpus/intent-corpus";
import { expandMany } from "../src/lib/slm/corpus/fillers";
import { extractSlots } from "../src/lib/slm/slots";
import { primaryPlace } from "../src/lib/geo/gazetteer";
import { CATEGORY_META } from "../src/lib/slm/labels";

const SYSTEM = "You are Chakra, the GamanChakra travel-risk co-pilot. Output only what is asked.";
const rows: string[] = [];
const push = (user: string, assistant: string) => rows.push(JSON.stringify({ messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }, { role: "assistant", content: assistant }] }));

const ADVICE: Record<string, string> = {
  natural_disaster: "Avoid the affected area, follow local authorities, keep your phone charged and confirm your safety with your contacts.",
  severe_weather: "Expect delays; move outdoor plans indoors, leave extra buffer for airport and station transfers.",
  conflict_security: "Stay indoors away from crowds and government buildings, register with your embassy and prepare to leave if advised.",
  civil_unrest: "Avoid protest sites, pre-book transport, and shift sightseeing to unaffected areas or another day.",
  transport_disruption: "Check your booking status now; consider alternative flights, trains or buses and claim compensation if eligible.",
  health_outbreak: "Follow health advisories, carry repellent and sanitiser, and check vaccination or screening requirements.",
  policy_advisory: "Re-check entry rules and documents before departure and follow your government's advisory level.",
  infrastructure_outage: "Carry some cash, download offline maps and tickets, and expect slower check-in.",
  crowd_event: "Expect crowds and closures; start early, pre-book tickets and avoid peak hours.",
  price_economy: "Lock in prices early and review your budget buffer.",
  travel_opportunity: "This may be a good moment to book.",
  not_travel: "No travel impact expected.",
};

[...NEWS_TEMPLATES, ...NEWS_HANDWRITTEN].forEach(([cat, sev, tpl], i) => {
  for (const headline of expandMany(tpl, 3, 900 + i)) {
    const place = primaryPlace(headline);
    push(
      `Classify this headline for travel impact. Reply as JSON {category, severity, location}.\nHEADLINE: ${headline}`,
      JSON.stringify({ category: cat, severity: sev, location: place ? `${place.name}, ${place.countryName}` : null }),
    );
    if (cat !== "not_travel") {
      push(
        `CONTEXT: ${headline} (${CATEGORY_META[cat].label}, severity ${sev}).\nWrite a two-sentence advisory for a traveller heading there.`,
        `${place ? `Heads up for ${place.name}: ` : "Heads up: "}${headline.replace(/\s+-\s+.*$/, "")}. ${ADVICE[cat]}`,
      );
    }
  }
});

Object.entries(INTENT_TEMPLATES).forEach(([intent, tpls], i) => {
  tpls.forEach((tpl, j) => {
    for (const cmd of expandMany(tpl, 2, 5000 + i * 100 + j)) {
      const s = extractSlots(cmd);
      push(
        `Parse this voice command into JSON {intent, destination, origin, days, budgetInr}.\nCOMMAND: ${cmd}`,
        JSON.stringify({ intent, destination: s.destination?.name ?? null, origin: s.origin?.name ?? null, days: s.days ?? null, budgetInr: s.budgetInr ?? null }),
      );
    }
  });
});

fs.mkdirSync("slm/data", { recursive: true });
fs.writeFileSync("slm/data/sft.jsonl", rows.join("\n") + "\n");
console.log(`Wrote ${rows.length} SFT examples to slm/data/sft.jsonl`);
