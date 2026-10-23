import countriesRaw from "world-countries";
import { CITY_ROWS } from "./cities-data";

export type PlaceKind = "city" | "country" | "airport";

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  radiusKm: number;
  iata: string[];
  region?: string;
}

export interface PlaceMatch extends Place {
  matched: string;
  index: number;
}

interface CountryRow {
  cca2: string;
  name: { common: string; official: string; native?: Record<string, { common: string }> };
  altSpellings: string[];
  demonyms?: { eng?: { m: string; f: string } };
  latlng: [number, number];
  area: number;
}

const countries = ((countriesRaw as unknown as { default?: CountryRow[] }).default ?? (countriesRaw as unknown as CountryRow[]));

/** Words that are also place names; only matched when Capitalised mid-sentence. */
const AMBIGUOUS = new Set([
  "nice", "split", "male", "victoria", "turkey", "chad", "jordan", "georgia", "guinea", "china", "mali", "niger",
  "kl", "la", "sf", "rio", "reading", "bath", "mobile", "orange", "phoenix", "aurora", "salem", "panama", "kandy", "petra",
]);
const NEVER_MATCH = new Set(["in", "us", "it", "to", "is", "as", "me", "be", "no", "id", "am", "my", "at", "on", "or", "so", "do", "de", "la"]);

export function normalizeText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const placesById = new Map<string, Place>();
const phraseIndex = new Map<string, Place>();
const iataIndex = new Map<string, Place>();
let maxPhraseWords = 1;

function addPhrase(phrase: string, place: Place, override = false) {
  const key = normalizeText(phrase);
  if (!key || NEVER_MATCH.has(key)) return;
  if (!override && phraseIndex.has(key)) return;
  phraseIndex.set(key, place);
  maxPhraseWords = Math.max(maxPhraseWords, key.split(" ").length);
}

function build() {
  const countryByCode = new Map<string, Place>();
  for (const c of countries) {
    const radius = Math.max(80, Math.min(1500, Math.round(Math.sqrt((c.area || 1000) / Math.PI))));
    const p: Place = {
      id: `country:${c.cca2}`, name: c.name.common, kind: "country", countryCode: c.cca2, countryName: c.name.common,
      lat: c.latlng[0], lng: c.latlng[1], radiusKm: radius, iata: [],
    };
    placesById.set(p.id, p);
    countryByCode.set(c.cca2, p);
    addPhrase(c.name.common, p);
    addPhrase(c.name.official, p);
    for (const a of c.altSpellings || []) if (a.length > 3) addPhrase(a, p);
    for (const n of Object.values(c.name.native || {})) if (n.common.length > 3) addPhrase(n.common, p);
    const dem = c.demonyms?.eng?.m;
    if (dem && dem.length > 4) addPhrase(dem, p);
  }
  // Friendly aliases
  const alias: Record<string, string> = {
    "usa": "US", "united states": "US", "america": "US", "uk": "GB", "britain": "GB", "england": "GB", "scotland": "GB",
    "uae": "AE", "emirates": "AE", "south korea": "KR", "korea": "KR", "north korea": "KP", "russia": "RU", "vietnam": "VN",
    "czechia": "CZ", "holland": "NL", "the netherlands": "NL", "burma": "MM", "laos": "LA", "syria": "SY", "iran": "IR",
    "palestine": "PS", "taiwan": "TW", "hong kong": "HK", "bharat": "IN", "भारत": "IN", "हिंदुस्तान": "IN", "lanka": "LK",
    "saudi": "SA", "ivory coast": "CI", "congo": "CD", "drc": "CD", "turkiye": "TR", "türkiye": "TR",
  };
  for (const [k, cc] of Object.entries(alias)) { const p = countryByCode.get(cc); if (p) addPhrase(k, p, true); }

  for (const raw of CITY_ROWS.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [name, aliases, cc, lat, lng, iata, region] = line.split("|");
    const country = countryByCode.get(cc);
    const p: Place = {
      id: `city:${cc}:${normalizeText(name).replace(/ /g, "-")}`, name, kind: "city", countryCode: cc,
      countryName: country?.name ?? cc, lat: Number(lat), lng: Number(lng), radiusKm: 60,
      iata: iata ? iata.split(";").filter(Boolean) : [], region: region || undefined,
    };
    placesById.set(p.id, p);
    addPhrase(name, p, true); // cities win over same-named countries (e.g. Singapore, Kuwait City)
    for (const a of (aliases || "").split(";")) if (a) addPhrase(a, p, true);
    for (const code of p.iata) iataIndex.set(code, p);
  }
}
build();

const AVIATION_CONTEXT = /\b(airport|flight|flights|airline|airlines|runway|terminal|fly|flying|to|from|via|land|landing|departure|arrival)\b/i;

/** Extract every known place mentioned in free text (headline, voice command, etc). */
export function extractPlaces(text: string): PlaceMatch[] {
  if (!text) return [];
  const original = text.replace(/\s+/g, " ");
  const tokens = original.split(" ");
  const normTokens = tokens.map((t) => normalizeText(t));
  const out: PlaceMatch[] = [];
  const used = new Set<number>();
  for (let n = Math.min(maxPhraseWords, 5); n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      if ([...Array(n).keys()].some((k) => used.has(i + k))) continue;
      const phrase = normTokens.slice(i, i + n).join(" ").trim();
      if (!phrase) continue;
      const place = phraseIndex.get(phrase);
      if (!place) continue;
      if (AMBIGUOUS.has(phrase)) {
        const first = tokens[i].replace(/^[^\p{L}]+/u, "");
        const capitalised = /^\p{Lu}/u.test(first);
        const isAllCapsHeadline = original === original.toUpperCase();
        const prev = normTokens[i - 1] || "";
        const prepositional = ["to", "in", "at", "from", "visit", "for", "near", "around", "of", "off", "hits", "strikes"].includes(prev);
        const nextComma = /,$/.test(tokens[i + n - 1] || "");
        if (!prepositional && !nextComma && (i === 0 || (!capitalised && !isAllCapsHeadline))) continue;
      }
      for (let k = 0; k < n; k++) used.add(i + k);
      out.push({ ...place, matched: tokens.slice(i, i + n).join(" "), index: i });
    }
  }
  // IATA codes (DEL, BOM, LHR) only with aviation context
  if (AVIATION_CONTEXT.test(original)) {
    tokens.forEach((t, i) => {
      const code = t.replace(/[^A-Z]/g, "");
      if (code.length === 3 && t.replace(/[^A-Za-z]/g, "") === code && iataIndex.has(code) && !used.has(i)) {
        const p = iataIndex.get(code)!;
        out.push({ ...p, kind: "airport", matched: code, index: i });
      }
    });
  }
  out.sort((a, b) => a.index - b.index);
  return out;
}

/** Best single location for an event or command: first city, else first country. */
export function primaryPlace(text: string): PlaceMatch | null {
  const all = extractPlaces(text);
  return all.find((p) => p.kind === "city" || p.kind === "airport") ?? all[0] ?? null;
}

export function findPlace(name: string): Place | null {
  if (!name) return null;
  const key = normalizeText(name);
  return phraseIndex.get(key) ?? iataIndex.get(name.toUpperCase().trim()) ?? primaryPlace(name) ?? null;
}

export function getPlaceById(id: string): Place | null {
  return placesById.get(id) ?? null;
}

export function allCities(): Place[] {
  return [...placesById.values()].filter((p) => p.kind === "city");
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function nearestCity(lat: number, lng: number, maxKm = 400): Place | null {
  let best: Place | null = null;
  let bestD = Infinity;
  for (const p of placesById.values()) {
    if (p.kind !== "city") continue;
    const d = haversineKm({ lat, lng }, p);
    if (d < bestD) { bestD = d; best = p; }
  }
  return bestD <= maxKm ? best : null;
}

export function countryByCode(cc: string): Place | null {
  return placesById.get(`country:${cc.toUpperCase()}`) ?? null;
}

export interface AirportHubInfo {
  hubPlace: Place;
  iataCode: string;
  distanceKm: number;
  isRemoteHub: boolean;
}

export function findAirportHub(place: Place): AirportHubInfo | null {
  if (!place) return null;

  // 1. If place has an IATA code assigned
  if (place.iata && place.iata.length > 0) {
    const code = place.iata[0];
    const cities = allCities();
    // Check if another city is the primary hub for this IATA code
    const remotePrimary = cities.find(
      (c) => c.iata.includes(code) && c.id !== place.id && haversineKm(place, c) > 25
    );
    if (remotePrimary) {
      return {
        hubPlace: remotePrimary,
        iataCode: code,
        distanceKm: haversineKm(place, remotePrimary),
        isRemoteHub: true,
      };
    }
    return {
      hubPlace: place,
      iataCode: code,
      distanceKm: 0,
      isRemoteHub: false,
    };
  }

  // 2. If place does not have an IATA code, find nearest city in the same country with an airport
  const citiesWithAirport = allCities().filter(
    (c) => c.iata && c.iata.length > 0 && c.countryCode === place.countryCode
  );
  let bestHub: Place | null = null;
  let bestDist = Infinity;
  for (const c of citiesWithAirport) {
    const d = haversineKm(place, c);
    if (d < bestDist) {
      bestDist = d;
      bestHub = c;
    }
  }

  if (bestHub && bestHub.iata.length > 0) {
    return {
      hubPlace: bestHub,
      iataCode: bestHub.iata[0],
      distanceKm: bestDist,
      isRemoteHub: true,
    };
  }

  return null;
}
