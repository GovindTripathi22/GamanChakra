/** Bundled destination photos (no external image API). Returns null when we have no local photo. */
const LOCAL: Record<string, string> = { goa: "goa", jaipur: "jaipur", kerala: "kerala", kochi: "kerala", munnar: "kerala", varanasi: "varanasi", paris: "paris", dubai: "dubai", tokyo: "tokyo", "new york": "new-york", nyc: "new-york" };
export function localDestinationImage(destination: string): string | null {
  const first = destination.split(/->|\||,/)[0].trim().toLowerCase();
  const key = Object.keys(LOCAL).find((k) => first.includes(k));
  return key ? `/destinations/${LOCAL[key]}.jpg` : null;
}
