import type { RawArticle } from "./types";

/**
 * DRILL feed — used ONLY when live sources are unreachable (offline laptop, air-gapped demo, CI)
 * or when NEWS_MODE=drill. Every item is prefixed "Drill:" and stored with provenance "sample",
 * and the UI shows a SIMULATION badge, so nothing here can be mistaken for real news.
 */
const DRILLS: { mins: number; title: string; summary: string; lat?: number; lng?: number; hint?: RawArticle["hint"] }[] = [
  { mins: 12, title: "Drill: Dense fog cuts visibility to 50 m at Delhi airport, 140 flights delayed", summary: "Low-visibility procedures in force; airlines advise passengers to check status before leaving for the airport." },
  { mins: 25, title: "Drill: Transport unions call 24-hour bandh in Bengaluru tomorrow, cabs and autos to stay off roads", summary: "Commuters advised to plan airport transfers in advance." },
  { mins: 40, title: "Drill: Cyclone warning for Odisha and Andhra coast, red alert issued for Visakhapatnam", summary: "IMD expects landfall within 36 hours; ferry services suspended.", lat: 17.69, lng: 83.22 },
  { mins: 55, title: "Drill: M 6.4 earthquake — 40 km NE of Kathmandu, Nepal", summary: "Strong shaking reported; aftershocks expected.", lat: 27.95, lng: 85.6, hint: { category: "natural_disaster", severity: "high", radiusKm: 220, tags: ["earthquake", "M6.4"] } },
  { mins: 70, title: "Drill: Nationwide rail strike in France disrupts TGV and Paris metro services", summary: "SNCF expects only one in three high-speed trains to run." },
  { mins: 90, title: "Drill: Flash floods inundate low-lying areas of Dubai after record rainfall, DXB diverts inbound flights", summary: "Authorities urge residents to stay home; road closures across the city." },
  { mins: 110, title: "Drill: Bangkok protest march to close central roads near Democracy Monument on Saturday", summary: "Police advise tourists to avoid the area." },
  { mins: 130, title: "Drill: Dengue cases surge in Goa, health department issues advisory for tourists", summary: "Carry repellent; seek care for fever lasting over two days." },
  { mins: 150, title: "Drill: Typhoon signal 8 expected in Hong Kong, ferries and some flights suspended", summary: "Typhoon tracking west; signal may be raised overnight." },
  { mins: 170, title: "Drill: Heathrow check-in systems down after IT outage, long queues at Terminal 5", summary: "Manual check-in in progress; arrive early." },
  { mins: 200, title: "Drill: Thailand extends visa-free stay for Indian travellers to 60 days", summary: "Positive opportunity for leisure demand." },
  { mins: 230, title: "Drill: Curfew imposed in parts of Srinagar after clashes, mobile internet suspended", summary: "Tourists advised to stay at hotels." },
  { mins: 260, title: "Drill: Airfares to Goa surge 60% ahead of the Christmas week", summary: "Lock in fares early." },
  { mins: 300, title: "Drill: Mumbai local trains halted as tracks submerged after heavy rain", summary: "Red alert for Mumbai and Konkan; offices advised work-from-home." },
  { mins: 340, title: "Drill: Singapore marathon on Sunday, road closures around Marina Bay till noon", summary: "Plan airport transfers around the closures." },
  { mins: 380, title: "Drill: Cricket: India win the series 3-1", summary: "General news, no travel impact." },
];

export function drillArticles(now = new Date()): RawArticle[] {
  return DRILLS.map((d, i) => ({
    title: d.title,
    summary: d.summary,
    url: `https://voyage.app/drill/${i + 1}`,
    source: "Voyage Drill",
    sourceKind: "sample" as const,
    publishedAt: new Date(now.getTime() - d.mins * 60_000),
    lat: d.lat,
    lng: d.lng,
    hint: d.hint,
  }));
}
