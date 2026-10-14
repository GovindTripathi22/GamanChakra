import { extractPlaces, type PlaceMatch } from "@/lib/geo/gazetteer";

/** Slot filling for voice/text commands (works on English, Hinglish and Devanagari input). */
export interface Slots {
  places: PlaceMatch[];
  origin?: PlaceMatch;
  destination?: PlaceMatch;
  days?: number;
  budgetInr?: number;
  travelers?: number;
  amount?: number;
  currency?: string;
  targetCurrency?: string;
  flightNumber?: string;
  trainNumber?: string;
  delayHours?: number;
  autonomyLevel?: "L0" | "L1" | "L2" | "L3" | "L4";
  page?: string;
  language?: string;
  phrase?: string;
  when?: string;
}

const CURRENCIES: [RegExp, string][] = [
  [/\b(usd|dollars?|bucks|\$)\b|\$/i, "USD"], [/\b(eur|euros?|€)\b|€/i, "EUR"], [/\b(gbp|pounds?|£)\b|£/i, "GBP"],
  [/\b(jpy|yen)\b/i, "JPY"], [/\b(aed|dirhams?|dirham)\b/i, "AED"], [/\b(thb|baht)\b/i, "THB"], [/\b(sgd|singapore dollars?)\b/i, "SGD"],
  [/\b(myr|ringgit)\b/i, "MYR"], [/\b(aud|australian dollars?)\b/i, "AUD"], [/\b(cad|canadian dollars?)\b/i, "CAD"],
  [/\b(inr|rupees?|rupaye|rs\.?|₹)\b|₹|रुपये/i, "INR"], [/\b(lkr|sri lankan rupees?)\b/i, "LKR"], [/\b(npr|nepali rupees?)\b/i, "NPR"],
  [/\b(chf|swiss francs?)\b/i, "CHF"], [/\b(cny|yuan|rmb)\b/i, "CNY"], [/\b(krw|won)\b/i, "KRW"], [/\b(sar|riyals?)\b/i, "SAR"],
];

const PAGES: [RegExp, string][] = [
  [/mission control|command (center|centre)|dashboard|world map|the map|risk radar|news feed/i, "/command"],
  [/duty of care|travell?ers? (list|console)|employees/i, "/duty-of-care"],
  [/automations?|rules?/i, "/automations"],
  [/agent (logs?|runs?|activity)|approvals?|inbox/i, "/agent"],
  [/my trips|trips/i, "/my-trips"],
  [/pricing|subscription|upgrade/i, "/pricing"],
  [/settings|developer|api keys?/i, "/settings"],
  [/claims?|compensation/i, "/claims"],
  [/\bhome\b/i, "/"],
];

const LANGS = ["japanese", "french", "thai", "spanish", "german", "italian", "hindi", "tamil", "arabic", "korean", "bengali", "kannada", "mandarin", "chinese", "indonesian", "vietnamese", "portuguese", "malay", "telugu", "marathi", "nepali", "sinhala", "turkish", "russian", "greek"];

function parseIndianAmount(raw: string): number | undefined {
  const s = raw.toLowerCase().replace(/,/g, "").trim();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(k|thousand|hazaar|hazar|lakh|lac|lakhs|l|crore|cr)?/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2];
  if (!unit) return n;
  if (["k", "thousand", "hazaar", "hazar"].includes(unit)) return n * 1_000;
  if (["lakh", "lac", "lakhs", "l"].includes(unit)) return n * 100_000;
  if (["crore", "cr"].includes(unit)) return n * 10_000_000;
  return n;
}

export function extractSlots(text: string): Slots {
  const t = text.trim();
  const lower = t.toLowerCase();
  const places = extractPlaces(t);
  const slots: Slots = { places };

  // origin / destination
  const fromTo = lower.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s+(?:for|under|in|on|with|next|this)\b|[,.?!]|$)/);
  const seTak = t.match(/(.+?)\s+(?:से|se)\s+(.+?)\s+(?:तक|tak|jana|जाना)/);
  if (fromTo) {
    slots.origin = extractPlaces(fromTo[1])[0];
    slots.destination = extractPlaces(fromTo[2])[0];
  } else if (seTak) {
    const a = extractPlaces(seTak[1]); const b = extractPlaces(seTak[2]);
    slots.origin = a[a.length - 1]; slots.destination = b[0];
  }
  if (!slots.destination) {
    const words = t.replace(/\s+/g, " ").split(" ");
    const toMatch = places.find((p) => /^(to|in|for|at|visit|near|around|of|mein|को)$/i.test(words[p.index - 1] || ""));
    slots.destination = toMatch ?? places[places.length - 1];
  }
  if (slots.origin && slots.destination && slots.origin.id === slots.destination.id) slots.origin = undefined;

  const days = lower.match(/(\d+)\s*(?:-|\s)?(?:days?|din|nights?|दिन)/) || lower.match(/(?:a|one)\s+week/);
  if (days) slots.days = days[1] ? Number(days[1]) : 7;
  if (/\bweekend\b/.test(lower) && !slots.days) slots.days = 2;

  const budget = lower.match(/(?:under|budget(?: of)?|within|below|upto|up to|max(?:imum)?|₹|rs\.?|inr)\s*₹?\s*([\d.,]+\s*(?:k|thousand|lakh|lac|l|crore|cr)?)/) || lower.match(/([\d.,]+\s*(?:k|lakh|lac))\b/);
  if (budget) slots.budgetInr = parseIndianAmount(budget[1]);

  const trav = lower.match(/(\d+)\s*(?:people|persons|travell?ers|adults|of us|log)/) || (/(couple|two of us|honeymoon)/.test(lower) ? ["", "2"] : null) || (/\bsolo\b|\balone\b/.test(lower) ? ["", "1"] : null) || (/family/.test(lower) ? ["", "4"] : null);
  if (trav) slots.travelers = Number(trav[1]);

  // currency conversion: "convert 300 euros to rupees", "how much is 50 dollars in inr", "how many yen for 1000 rupees"
  const amt = lower.match(/(\d[\d,]*(?:\.\d+)?)\s*([a-z₹$€£]+(?:\s+dollars?)?)/);
  const found = CURRENCIES.filter(([re]) => re.test(lower)).map(([, c]) => c);
  if (amt) {
    slots.amount = Number(amt[1].replace(/,/g, ""));
    const unit = CURRENCIES.find(([re]) => re.test(amt[2]));
    slots.currency = unit?.[1];
  }
  if (found.length) {
    if (!slots.currency) slots.currency = found[0];
    slots.targetCurrency = found.find((c) => c !== slots.currency) ?? (slots.currency === "INR" ? "USD" : "INR");
  }

  const flight = t.match(/\b([A-Z0-9]{2})\s?-?(\d{2,4})\b/);
  if (flight && /flight|fly|plane|airline|[A-Z]{2}\s?\d/.test(t)) slots.flightNumber = `${flight[1]} ${flight[2]}`;
  const train = lower.match(/\b(\d{5})\b/);
  if (train) slots.trainNumber = train[1];
  const delay = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ghante|घंटे)/);
  if (delay) slots.delayHours = Number(delay[1]);

  const lvl = lower.match(/\bl([0-4])\b/);
  if (lvl) slots.autonomyLevel = `L${lvl[1]}` as Slots["autonomyLevel"];
  else if (/full(y)? (autopilot|autonomous|autonomy)|autopilot on|turn on autopilot|act on its own|enable full/.test(lower)) slots.autonomyLevel = "L3";
  else if (/notify only|only notify|just notify|alerts only/.test(lower)) slots.autonomyLevel = "L1";
  else if (/observe only|turn off autopilot|autopilot off|disable/.test(lower)) slots.autonomyLevel = "L0";
  else if (/approval|asking me|supervised|without asking/.test(lower)) slots.autonomyLevel = "L2";

  for (const [re, path] of PAGES) if (re.test(lower)) { slots.page = path; break; }

  const lang = LANGS.find((l) => lower.includes(l));
  if (lang) slots.language = lang;
  const phrase = lower.match(/(?:say|translate|is|teach me to say)\s+["“]?(.+?)["”]?\s+(?:in|into|to)\s+(?:japanese|french|thai|spanish|german|italian|hindi|tamil|arabic|korean|bengali|kannada|mandarin|chinese|indonesian|vietnamese|portuguese|malay|telugu|marathi|nepali|sinhala|turkish|russian|greek)/);
  if (phrase) slots.phrase = phrase[1].replace(/^(how do i|how do you)\s+/, "");

  const when = lower.match(/\b(today|tonight|tomorrow|this weekend|next week|next month|this week|kal|aaj)\b/);
  if (when) slots.when = when[1];
  return slots;
}
