/**
 * Domain lexicon: expert-curated word stems that give the neural model prior knowledge about
 * travel-risk language it may not have seen in training (neuro-symbolic features).
 * A token matching a stem emits a `lex:<label>` feature into the embedding bag, so the network
 * learns how much to trust each cue. Stems are prefix-matched on normalised tokens.
 */
export const CATEGORY_LEXICON: Record<string, string[]> = {
  natural_disaster: [
    "quake", "earthquak", "tremor", "aftershock", "seismic", "richter", "magnitude", "tsunami", "erupt", "volcan", "lava", "ash",
    "landslid", "landslip", "mudslid", "cloudburst", "flood", "inundat", "submerg", "deluge", "washed", "washout", "breach",
    "cyclon", "hurrican", "typhoon", "tornado", "twister", "avalanch", "wildfire", "bushfire", "forest", "blaze", "glof",
    "rubble", "collaps", "devastat", "disaster", "calamit", "relief", "rescu", "ndrf", "evacuat", "sinkhole", "drought",
    "बाढ़", "भूकंप", "भूस्खलन", "तूफान",
  ],
  severe_weather: [
    "fog", "smog", "visibility", "rain", "rainfall", "downpour", "shower", "monsoon", "thunder", "lightning", "hail", "storm",
    "snow", "blizzard", "frost", "freez", "cold", "chill", "heatwav", "heat", "scorch", "temperatur",
    "degree", "imd", "met", "forecast", "alert", "aqi", "pollut", "air quality", "hazardous", "humid", "gust", "wind",
    "waterlog", "weather", "mausam", "°c", "frozen", "ice", "icy", "signal",     "कोहरा", "बारिश", "ठंड", "गर्मी", "मौसम",
  ],
  conflict_security: [
    "terror", "militant", "insurgen", "rebel", "attack", "bomb", "blast", "explos", "grenade", "ied", "missile", "rocket",
    "drone", "airstrik", "strike on", "shell", "artiller", "gunfire", "gunmen", "shooting", "shot", "stab", "knife",
    "hostage", "kidnap", "abduct", "war", "military", "army", "troop", "coup", "junta", "ceasefir", "border clash",
    "intercept", "siren", "threat", "security", "cordon", "seal", "killed", "dead", "casualt",
    "robbed", "robbery", "pickpocket", "theft", "crime", "encounter", "invasion", "hamas", "hezbollah",
  ],
  civil_unrest: [
    "protest", "protester", "demonstrat", "agitat", "march", "rally", "strike", "walkout", "bandh", "hartal", "shutdown",
    "chakka", "roko", "blockade", "block", "curfew", "riot", "clash", "violence", "violent", "tear gas", "teargas", "lathi",
    "water cannon", "unrest", "tension", "communal", "section 144", "internet suspend",     "dharna", "sit-in", "union", "unions", "agitation", "gherao", "stir",   ],
  transport_disruption: [
    "flight", "flights", "airline", "airlines", "airport", "runway", "terminal", "aircraft", "plane", "jet", "carrier",
    "cancel", "delay", "divert", "ground", "grounded", "strand", "rescheduled", "train", "trains", "rail", "railway",
    "derail", "metro", "local train", "ferry", "ferries", "cruise", "bus", "buses", "highway", "expressway", "road",
    "traffic", "atc", "air traffic", "departure", "arrival", "connection", "passenger", "commuter", "suspend", "halt",
    "services", "vande", "rajdhani", "shatabdi", "express", "irctc", "indigo", "spicejet", "akasa", "emirates", "lufthansa",
    "ryanair", "gatwick", "heathrow", "insolven", "bankrupt",   ],
  health_outbreak: [
    "outbreak", "epidemic", "pandemic", "virus", "viral", "infect", "case", "cases", "disease", "dengue", "malaria", "cholera",
    "measles", "mpox", "monkeypox", "nipah", "zika", "ebola", "marburg", "covid", "corona", "flu", "influenza", "avian",
    "bird flu", "h5n1", "rabies", "hepatitis", "typhoid", "chikungunya", "who", "health", "hospital", "quarantin", "vaccin",
    "contamina", "poisoning", "pathogen", "mask", "contagio",
  ],
  policy_advisory: [
    "visa", "e-visa", "evisa", "eta", "etias", "permit", "passport", "border", "borders", "entry", "immigration",
    "advisory", "advise", "advises", "mea", "embassy", "consulate", "travel ban", "ban", "restrict", "requirement",
    "rule", "rules", "regulation", "fee", "levy", "tourist tax", "schengen", "deport", "leave the country", "citizens",
    "nationals", "reconsider", "level 3", "level 4", "do not travel", "crossing", "sdf",
  ],
  infrastructure_outage: [
    "outage", "blackout", "power cut", "power failure", "grid", "electricity", "load shedding", "internet", "network",
    "telecom", "mobile", "jio", "airtel", "server", "glitch", "crash", "down", "it outage", "cyber", "ransomware", "hack",
    "upi", "paytm", "gpay", "atm", "payment", "transactions", "fuel shortage", "petrol", "diesel", "pumps", "dry",
    "water supply", "microsoft", "crowdstrike", "system", "systems", "check-in system", "fail", "failing",
  ],
  crowd_event: [
    "festival", "mela", "kumbh", "yatra", "rath", "pilgrim", "devotee", "procession", "fair", "carnival", "concert", "gig",
    "summit", "g20", "vip", "marathon", "parade", "celebrat", "diwali", "holi", "durga", "ganesh", "ganeshotsav", "dasara",
    "dussehra", "eid", "christmas", "new year", "sunburn", "olympic", "world cup", "match", "stadium", "stampede",
    "crowd", "crush", "rush", "throng", "footfall", "overtourism", "overcrowd", "visitors",     "long weekend", "jam", "snarl",   ],
  price_economy: [
    "fare", "fares", "price", "prices", "pricier", "costlier", "expensive", "cheap", "surge", "hike", "jump", "soar",
    "inflation", "rupee", "dollar", "currency", "exchange rate", "slump", "depreciat", "atf", "jet fuel",
    "surcharge", "gst", "tariff", "rates", "ticket price", "double", "costs", "economy", "recession",
  ],
  travel_opportunity: [
    "launch", "launches", "new route", "nonstop", "non-stop", "direct flight", "inaugurat", "opens", "reopen", "visa-free",
    "visa free", "without visa", "visa on arrival", "free visa", "sale", "offer", "offers", "discount", "slash", "deal",
    "campaign", "woo", "attract", "new airport", "new rail", "rail link", "ropeway", "connectivity", "starts", "begins",
    "extends", "eases", "relax", "faster",
  ],
  not_travel: [
    "cricket", "century", "wicket", "ipl", "football", "goal", "tennis", "chess", "olympic champion", "sensex", "nifty",
    "stock", "stocks", "shares", "market", "markets", "ipo", "funding", "startup", "founder", "profit", "revenue", "quarter",
    "earnings", "smartphone", "iphone", "launch event", "film", "movie", "box office", "actor", "actress", "bollywood",
    "director", "cannes", "celebrity", "court", "supreme court", "petition", "verdict", "election", "poll", "minister",
    "parliament", "bill", "scheme", "gold", "researchers", "study", "scientists", "battery", "ai model", "recipe", "opinion",
  ],
};

export const INTENT_LEXICON: Record<string, string[]> = {
  weather: ["weather", "rain", "raining", "forecast", "temperature", "hot", "cold", "snow", "umbrella", "mausam", "sunny", "humid", "मौसम", "बारिश"],
  safety_check: ["safe", "safety", "dangerous", "danger", "risk", "risky", "threat", "secure", "theek", "सुरक्षित"],
  affected_travelers: ["who", "which", "list", "how many", "team", "employees", "staff", "travellers", "travelers", "people", "responded", "checked", "kaun"],
  traveler_checkin: ["check-in", "checkin", "check in", "ping", "send", "message", "notify", "confirm", "safety confirmation", "bhejo"],
  run_agent: ["scan", "sweep", "run", "refresh", "monitor", "agent", "guardian"],
  set_autonomy: ["autopilot", "autonomy", "autonomous", "approval", "asking", "permission", "supervised", "level", "l0", "l1", "l2", "l3", "l4"],
  thanks_bye: ["thanks", "thank", "bye", "goodbye", "later", "shukriya", "dhanyavaad"],
  trip_status: ["my trip", "itinerary", "planned", "schedule", "upcoming", "status", "tomorrow", "today"],
  plan_trip: ["plan", "itinerary", "trip", "holiday", "vacation", "getaway", "banao", "honeymoon"],
  disruption_help: ["cancelled", "canceled", "delayed", "late", "missed", "miss", "reroute", "rebook", "alternative", "shut", "closed", "another route"],
  emergency_sos: ["emergency", "sos", "ambulance", "hospital", "police", "stolen", "robbed", "injured", "urgent", "danger", "help me", "bachao"],
  compensation_claim: ["compensation", "refund", "claim", "owed", "eu261", "dgca", "denied boarding", "money back"],
  news_brief: ["news", "latest", "headlines", "happening", "brief", "briefing", "alerts", "khabar", "खबर"],
  currency_convert: ["convert", "rupees", "inr", "dollars", "euros", "dirham", "exchange rate", "kitne rupees", "currency"],
  out_of_scope: ["joke", "funny", "song", "music", "poem", "president", "movie", "pizza", "alarm", "capital of"],
};

function compile(lex: Record<string, string[]>): { label: string; stem: string; multi: boolean }[] {
  const out: { label: string; stem: string; multi: boolean }[] = [];
  for (const [label, stems] of Object.entries(lex)) for (const s of stems) out.push({ label, stem: s.toLowerCase(), multi: s.includes(" ") || s.includes("-") });
  return out;
}
const CAT = compile(CATEGORY_LEXICON);
const INT = compile(INTENT_LEXICON);

/** Emit lexicon features for a normalised token list. */
export function lexiconFeatures(tokens: string[], rawLower: string): string[] {
  const feats = new Set<string>();
  for (const table of [CAT, INT]) {
    const prefix = table === CAT ? "lc" : "li";
    for (const { label, stem, multi } of table) {
      if (multi) {
        if (rawLower.includes(stem)) feats.add(`${prefix}:${label}`);
      } else if (stem.length <= 3) {
        if (tokens.includes(stem)) feats.add(`${prefix}:${label}`);
      } else if (tokens.some((t) => t.startsWith(stem))) {
        feats.add(`${prefix}:${label}`);
      }
    }
  }
  return [...feats];
}

/** Count of lexicon hits per category (used as an interpretable evidence signal in explanations). */
export function categoryEvidence(text: string): Record<string, string[]> {
  const lower = text.toLowerCase();
  const toks = lower.split(/[^\p{L}\p{N}°-]+/u).filter(Boolean);
  const out: Record<string, string[]> = {};
  for (const { label, stem, multi } of CAT) {
    const hit = multi ? lower.includes(stem) : stem.length <= 3 ? toks.includes(stem) : toks.some((t) => t.startsWith(stem));
    if (hit) (out[label] ||= []).push(stem);
  }
  return out;
}
