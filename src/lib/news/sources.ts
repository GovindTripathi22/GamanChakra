import type { SourceConfig } from "./types";

/**
 * Real-time, KEYLESS public sources. None of these need an account or API key.
 * Add your own with NEWS_EXTRA_FEEDS="https://site/rss.xml,https://other/feed".
 */
export const DEFAULT_SOURCES: SourceConfig[] = [
  {
    id: "gdelt-travel",
    name: "GDELT Global News (travel risk)",
    kind: "gdelt",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
      encodeURIComponent('(airport OR flights OR "train cancelled" OR strike OR protest OR curfew OR earthquake OR cyclone OR flood OR landslide OR outbreak OR "travel advisory" OR evacuation) sourcelang:english') +
      "&mode=ArtList&format=json&maxrecords=100&timespan=3h&sort=DateDesc",
    reliability: 0.7,
  },
  { id: "usgs-quakes", name: "USGS Earthquakes (M4.5+, 24h)", kind: "usgs", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson", reliability: 0.99 },
  { id: "gdacs", name: "GDACS Global Disaster Alerts (UN/EU)", kind: "gdacs", url: "https://www.gdacs.org/xml/rss.xml", reliability: 0.97 },
  {
    id: "gnews-india-travel", name: "Google News — India travel disruptions", kind: "google_news", region: "IN", reliability: 0.75,
    url: "https://news.google.com/rss/search?q=" + encodeURIComponent("(flight OR train OR airport OR highway) (cancelled OR delayed OR shut OR closed OR strike OR bandh) when:1d") + "&hl=en-IN&gl=IN&ceid=IN:en",
  },
  {
    id: "gnews-world-travel", name: "Google News — global travel alerts", kind: "google_news", reliability: 0.75,
    url: "https://news.google.com/rss/search?q=" + encodeURIComponent('("travel advisory" OR "airspace closed" OR "flights cancelled" OR evacuation OR curfew OR "state of emergency") when:1d') + "&hl=en-US&gl=US&ceid=US:en",
  },
  { id: "bbc-world", name: "BBC World", kind: "rss", url: "https://feeds.bbci.co.uk/news/world/rss.xml", reliability: 0.9 },
  { id: "aljazeera", name: "Al Jazeera", kind: "rss", url: "https://www.aljazeera.com/xml/rss/all.xml", reliability: 0.85 },
  { id: "the-hindu", name: "The Hindu — National", kind: "rss", region: "IN", url: "https://www.thehindu.com/news/national/feeder/default.rss", reliability: 0.88 },
  { id: "toi-india", name: "Times of India — India", kind: "rss", region: "IN", url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", reliability: 0.8 },
  { id: "reliefweb", name: "ReliefWeb (UN OCHA) updates", kind: "rss", url: "https://reliefweb.int/updates/rss.xml", reliability: 0.92 },
];

export function getSources(): SourceConfig[] {
  const disabled = new Set((process.env.NEWS_DISABLED_SOURCES || "").split(",").map((s) => s.trim()).filter(Boolean));
  const extra = (process.env.NEWS_EXTRA_FEEDS || "").split(",").map((s) => s.trim()).filter(Boolean)
    .map((url, i): SourceConfig => ({ id: `extra-${i}`, name: new URL(url).hostname, kind: "rss", url, reliability: 0.7 }));
  return [...DEFAULT_SOURCES, ...extra].filter((s) => !disabled.has(s.id) && s.enabled !== false);
}

/** Destination-specific Google News queries so every active trip gets its own watch-list. */
export function destinationWatchSource(city: string): SourceConfig {
  const q = `"${city}" (flight OR airport OR train OR strike OR protest OR flood OR rain OR curfew OR closed OR earthquake OR advisory) when:1d`;
  return {
    id: `watch-${city.toLowerCase().replace(/\W+/g, "-")}`,
    name: `Watch: ${city}`,
    kind: "google_news",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`,
    reliability: 0.75,
  };
}
