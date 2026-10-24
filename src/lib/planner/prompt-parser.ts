import { extractPlaces, type PlaceMatch } from "@/lib/geo/gazetteer";
import { extractSlots } from "@/lib/slm/slots";

export interface ParsedTripQuery {
  destination: string;
  origin?: string;
  days?: string;
  budget?: "cheap" | "moderate" | "luxury";
  rawBudgetInr?: number;
  travelers?: "just-me" | "couple" | "family" | "friends";
  travelersLabel?: string;
  vibe?: "relaxed" | "adventure" | "foodie" | "spiritual";
  startDate?: string;
  includeTravelDays?: "yes" | "no";
  confidenceScore: number;
  detectedChips: {
    icon: string;
    label: string;
    type: "destination" | "origin" | "days" | "budget" | "travelers" | "vibe" | "date" | "mode";
  }[];
}

/**
 * Intelligent natural language parser for trip prompts entered in search bars or voice inputs.
 * Parses destination, origin, days, budget, travelers group, vibe, and travel dates.
 */
export function parseTripPrompt(input: string): ParsedTripQuery {
  const text = (input || "").trim();
  const lower = text.toLowerCase();

  // Baseline SLM slots
  const slmSlots = extractSlots(text);

  let destination = "";
  let origin = "";
  let days: string | undefined = undefined;
  let budget: "cheap" | "moderate" | "luxury" | undefined = undefined;
  let rawBudgetInr: number | undefined = slmSlots.budgetInr;
  let travelers: "just-me" | "couple" | "family" | "friends" | undefined = undefined;
  let travelersLabel: string | undefined = undefined;
  let vibe: "relaxed" | "adventure" | "foodie" | "spiritual" | undefined = undefined;
  let startDate: string | undefined = undefined;
  let includeTravelDays: "yes" | "no" | undefined = undefined;

  // Delimiter for parameters that usually follow origin/destination
  const trailingBoundaries = `(?=\\s+(?:for|under|in|on|with|next|this|budget|starting|start|cheap|luxury|moderate|couple|solo|family|friends|group|relaxed|adventure|foodie|spiritual|\\d+\\s*(?:days?|nights?|din|k|lakh|rs|inr))\\b|[,.?!]|$)`;

  // 1. ORIGIN & DESTINATION EXTRACTION
  const fromToMatch = lower.match(new RegExp(`\\bfrom\\s+([a-zA-Z\\s]+?)\\s+to\\s+([a-zA-Z\\s]+?)${trailingBoundaries}`, "i"));
  const toFromMatch = lower.match(new RegExp(`\\b(?:trip|travel|tour|going|holiday|vacation)?\\s*to\\s+([a-zA-Z\\s]+?)\\s+from\\s+([a-zA-Z\\s]+?)${trailingBoundaries}`, "i"));
  const directToMatch = lower.match(new RegExp(`^(?:a\\s+)?(?:trip|travel|tour)?\\s*([a-zA-Z\\s]+?)\\s+to\\s+([a-zA-Z\\s]+?)${trailingBoundaries}`, "i"));
  const seTakMatch = lower.match(new RegExp(`([a-zA-Z\\s]+?)\\s+(?:se|say)\\s+([a-zA-Z\\s]+?)(?:\\s+(?:tak|jana|jaana|ke\\s+liye))?${trailingBoundaries}`, "i"));

  if (fromToMatch) {
    origin = cleanPlaceString(fromToMatch[1]);
    destination = cleanPlaceString(fromToMatch[2]);
  } else if (toFromMatch) {
    destination = cleanPlaceString(toFromMatch[1]);
    origin = cleanPlaceString(toFromMatch[2]);
  } else if (directToMatch) {
    origin = cleanPlaceString(directToMatch[1]);
    destination = cleanPlaceString(directToMatch[2]);
  } else if (seTakMatch) {
    origin = cleanPlaceString(seTakMatch[1]);
    destination = cleanPlaceString(seTakMatch[2]);
  } else {
    // Check gazetteer places
    if (slmSlots.origin?.name) {
      origin = slmSlots.origin.name;
    }
    if (slmSlots.destination?.name) {
      destination = slmSlots.destination.name;
    }

    // Direct pattern "to [Destination]"
    if (!destination) {
      const justTo = lower.match(new RegExp(`\\b(?:to|in|at|visit|visiting)\\s+([a-zA-Z\\s]+?)${trailingBoundaries}`, "i"));
      if (justTo) {
        destination = cleanPlaceString(justTo[1]);
      }
    }
  }

  // Cross-verify with places gazetteer if available
  const places = extractPlaces(text);
  if (places.length > 0) {
    if (!destination) {
      destination = places[0].name;
    }
    if (places.length > 1 && !origin) {
      // If destination was places[0], origin is places[1] or vice-versa
      if (destination.toLowerCase() === places[0].name.toLowerCase()) {
        origin = places[1].name;
      } else {
        origin = places[0].name;
      }
    }
  }

  // Fallback cleaning if destination still empty
  if (!destination) {
    destination = text
      .replace(/^(?:a\s+)?(?:trip|travel|tour|going|holiday|vacation|itinerary|plan|explore)\s+(?:to|for)?\s+/i, "")
      .replace(/\s+(?:for|under|with|budget|starting|cheap|luxury|couple|solo|family|friends).*/i, "")
      .trim();
  }

  // Normalize capitalization of destination and origin
  destination = formatPlaceTitle(destination);
  if (origin) {
    origin = formatPlaceTitle(origin);
  }

  // 2. DURATION / DAYS EXTRACTION
  if (slmSlots.days) {
    days = slmSlots.days.toString();
  } else {
    const daysMatch = lower.match(/(\d+)\s*(?:-|\s)?(?:days?|nights?|din|raat)/i);
    if (daysMatch) {
      days = daysMatch[1];
    } else if (/\b(?:a|one)\s+week\b/i.test(lower)) {
      days = "7";
    } else if (/\b(?:two|2)\s+weeks\b/i.test(lower)) {
      days = "14";
    } else if (/\bweekend\b/i.test(lower)) {
      days = "2";
    }
  }

  // 3. BUDGET EXTRACTION & TIER MAPPING
  if (slmSlots.budgetInr) {
    rawBudgetInr = slmSlots.budgetInr;
  } else {
    const budgetMatch = lower.match(/(?:under|budget(?: of)?|within|below|upto|up to|max(?:imum)?|around|₹|rs\.?|inr)\s*₹?\s*([\d.,]+\s*(?:k|thousand|lakh|lac|l|crore|cr)?)/i);
    if (budgetMatch) {
      rawBudgetInr = parseNumberWithUnits(budgetMatch[1]);
    }
  }

  if (rawBudgetInr !== undefined && rawBudgetInr > 0) {
    if (rawBudgetInr <= 20000) {
      budget = "cheap";
    } else if (rawBudgetInr <= 60000) {
      budget = "moderate";
    } else {
      budget = "luxury";
    }
  } else {
    // Keyword match
    if (/\b(cheap|budget|pocket-friendly|low-cost|backpacker|sasta|economical|economy)\b/i.test(lower)) {
      budget = "cheap";
    } else if (/\b(luxury|royal|premium|5-star|expensive|lavish|grand|five-star)\b/i.test(lower)) {
      budget = "luxury";
    } else if (/\b(moderate|standard|medium|reasonable|balanced)\b/i.test(lower)) {
      budget = "moderate";
    }
  }

  // 4. TRAVELERS GROUP EXTRACTION
  if (/\b(solo|alone|myself|just me|single|1 person|1 adult|one person)\b/i.test(lower)) {
    travelers = "just-me";
    travelersLabel = "1 (Solo)";
  } else if (/\b(couple|two of us|partner|wife|husband|boyfriend|girlfriend|honeymoon|2 people|2 persons|2 adults|do log|2 log)\b/i.test(lower)) {
    travelers = "couple";
    travelersLabel = "A Couple (2)";
  } else if (/\b(family|kids|children|parents|3 to 5|3 people|4 people|5 people|3 adults|4 adults|5 adults|small family)\b/i.test(lower)) {
    travelers = "family";
    travelersLabel = "Family (3-5)";
  } else if (/\b(friends|group|buddies|gang|colleagues|5\+|6 people|7 people|8 people|10 people|large group)\b/i.test(lower)) {
    travelers = "friends";
    travelersLabel = "Friends Group (5+)";
  } else if (slmSlots.travelers) {
    if (slmSlots.travelers === 1) {
      travelers = "just-me";
      travelersLabel = "1 (Solo)";
    } else if (slmSlots.travelers === 2) {
      travelers = "couple";
      travelersLabel = "A Couple (2)";
    } else if (slmSlots.travelers <= 5) {
      travelers = "family";
      travelersLabel = "Family (3-5)";
    } else {
      travelers = "friends";
      travelersLabel = "Friends Group (5+)";
    }
  }

  // 5. VIBE EXTRACTION
  if (/\b(relax|relaxed|chilling|chill|peace|peaceful|calm|beach|leisure|unwind|serene|tranquil)\b/i.test(lower)) {
    vibe = "relaxed";
  } else if (/\b(adventure|thrill|trek|trekking|hike|hiking|mountain|snow|adrenaline|camp|camping|sports)\b/i.test(lower)) {
    vibe = "adventure";
  } else if (/\b(food|foodie|culinary|street food|eat|gourmet|cuisine|dining|tasting)\b/i.test(lower)) {
    vibe = "foodie";
  } else if (/\b(spiritual|temple|religious|darshan|puja|ghat|ghats|yoga|meditation|pilgrimage|sacred|heritage|palace|romantic)\b/i.test(lower)) {
    vibe = "spiritual";
  }

  // 6. DATES / START DATE EXTRACTION
  const isoDate = lower.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
  if (isoDate) {
    startDate = isoDate[1];
  } else {
    // E.g. "15 Nov", "Nov 15", "10 Dec 2026", "25 October"
    const textDate = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?\b/i)
      || lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/i);

    if (textDate) {
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
      };
      let dStr = "";
      let mStr = "";
      let yStr = new Date().getFullYear().toString();

      if (textDate[1] && monthMap[textDate[2]?.slice(0, 3).toLowerCase()]) {
        dStr = textDate[1].padStart(2, "0");
        mStr = monthMap[textDate[2].slice(0, 3).toLowerCase()];
        if (textDate[3]) yStr = textDate[3];
      } else if (monthMap[textDate[1]?.slice(0, 3).toLowerCase()] && textDate[2]) {
        mStr = monthMap[textDate[1].slice(0, 3).toLowerCase()];
        dStr = textDate[2].padStart(2, "0");
        if (textDate[3]) yStr = textDate[3];
      }

      if (dStr && mStr) {
        startDate = `${yStr}-${mStr}-${dStr}`;
      }
    }
  }

  // 7. TRAVEL DAYS INCLUSION
  if (/\b(?:including|with|incl)\s+travel\b/i.test(lower)) {
    includeTravelDays = "yes";
  } else if (/\b(?:excluding|without|pure stay|excl)\s+travel\b/i.test(lower)) {
    includeTravelDays = "no";
  }

  // Confidence score
  let detectedCount = 0;
  if (destination) detectedCount++;
  if (origin) detectedCount++;
  if (days) detectedCount++;
  if (budget) detectedCount++;
  if (travelers) detectedCount++;
  if (vibe) detectedCount++;
  if (startDate) detectedCount++;
  const confidenceScore = Math.min(1.0, detectedCount / 4);

  // Generate detected chips for instant UI feedback
  const detectedChips: ParsedTripQuery["detectedChips"] = [];
  if (destination) {
    detectedChips.push({ icon: "📍", label: destination, type: "destination" });
  }
  if (origin) {
    detectedChips.push({ icon: "🛫", label: `From ${origin}`, type: "origin" });
  }
  if (days) {
    detectedChips.push({ icon: "⏱️", label: `${days} Days`, type: "days" });
  }
  if (budget) {
    const budgetTxt = rawBudgetInr
      ? `₹${rawBudgetInr.toLocaleString("en-IN")} (${budget})`
      : `${budget.charAt(0).toUpperCase() + budget.slice(1)} Budget`;
    detectedChips.push({ icon: "💰", label: budgetTxt, type: "budget" });
  }
  if (travelersLabel || travelers) {
    detectedChips.push({ icon: "👥", label: travelersLabel || travelers || "", type: "travelers" });
  }
  if (vibe) {
    detectedChips.push({ icon: "✨", label: vibe.charAt(0).toUpperCase() + vibe.slice(1), type: "vibe" });
  }
  if (startDate) {
    detectedChips.push({ icon: "📅", label: startDate, type: "date" });
  }
  if (includeTravelDays) {
    detectedChips.push({
      icon: "🚗",
      label: includeTravelDays === "yes" ? "Incl. Travel" : "Pure Stay",
      type: "mode"
    });
  }

  return {
    destination: destination || text,
    origin: origin || undefined,
    days,
    budget,
    rawBudgetInr,
    travelers,
    travelersLabel,
    vibe,
    startDate,
    includeTravelDays,
    confidenceScore,
    detectedChips,
  };
}

function cleanPlaceString(raw: string): string {
  return raw
    .replace(/^(?:trip|travel|tour|flight|train|bus|cab|ride|going|a\s+trip|vacation|holiday)\s+(?:to|from)?\s+/i, "")
    .replace(/\s+(?:for|under|with|budget|starting|cheap|luxury|couple|solo|family|friends|days|nights|din|log).*/i, "")
    .replace(/[,\.?!]+$/, "")
    .trim();
}

function formatPlaceTitle(str: string): string {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseNumberWithUnits(str: string): number | undefined {
  const s = str.toLowerCase().replace(/,/g, "").trim();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(k|thousand|hazaar|hazar|lakh|lac|lakhs|l|crore|cr)?/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2];
  if (!unit) return n;
  if (["k", "thousand", "hazaar", "hazar"].includes(unit)) return n * 1_000;
  if (["lakh", "lac", "lakhs", "l"].includes(unit)) return n * 100_000;
  if (["crore", "cr"].includes(unit)) return n * 10_000_000;
  return n;
}
