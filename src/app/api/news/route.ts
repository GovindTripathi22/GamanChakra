import { safeJson } from "@/lib/events/bus";
import { handler, json } from "@/lib/api";
import { db, isDbAvailable } from "@/lib/db";
import { ingestNews, getInMemoryNewsEvents } from "@/lib/news/pipeline";
import { NEWS_CATEGORIES, SEVERITIES, SEVERITY_RANK, type Severity } from "@/lib/slm/labels";

export const dynamic = "force-dynamic";

/** GET /api/news?category=&minSeverity=&q=&country=&hours=48&limit=60 — live, classified world events */
export const GET = handler(async (req) => {
  const u = new URL(req.url);
  const num = (v: string | null, d: number, max: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(max, n) : d; };
  const hours = num(u.searchParams.get("hours"), 48, 240);
  const limit = num(u.searchParams.get("limit"), 60, 200);
  const category = u.searchParams.get("category");
  const minSev = u.searchParams.get("minSeverity") as Severity | null;
  const q = u.searchParams.get("q")?.trim().slice(0, 80);
  const countryRaw = u.searchParams.get("country")?.toUpperCase();
  const country = countryRaw && /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : undefined;

  let rows: any[] = [];
  let statsObj: Record<string, number> = {};

  if (await isDbAvailable()) {
    try {
      rows = await db.newsEvent.findMany({
        where: {
          publishedAt: { gt: new Date(Date.now() - hours * 36e5) },
          ...(category && (NEWS_CATEGORIES as readonly string[]).includes(category) ? { category } : {}),
          ...(minSev && SEVERITIES.includes(minSev) ? { severity: { in: SEVERITIES.filter((s) => SEVERITY_RANK[s] >= SEVERITY_RANK[minSev]) } } : {}),
          ...(country ? { countryCode: country } : {}),
          ...(q ? { OR: [{ title: { contains: q } }, { placeName: { contains: q } }] } : {}),
        },
        orderBy: [{ publishedAt: "desc" }],
        take: limit,
      });
      const stats = await db.newsEvent.groupBy({ by: ["category"], where: { publishedAt: { gt: new Date(Date.now() - hours * 36e5) } }, _count: true });
      statsObj = Object.fromEntries(stats.map((s) => [s.category, s._count]));
    } catch {}
  }

  if (!rows.length) {
    const memEvents = getInMemoryNewsEvents();
    rows = memEvents.filter((e) => {
      if (category && e.category !== category) return false;
      if (minSev && SEVERITY_RANK[e.severity as Severity] < SEVERITY_RANK[minSev]) return false;
      if (country && e.countryCode !== country) return false;
      if (q && !`${e.title} ${e.placeName}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).slice(0, limit);

    for (const r of rows) {
      statsObj[r.category] = (statsObj[r.category] ?? 0) + 1;
    }
  }

  return json({ events: rows.map((r) => ({ ...r, tags: safeJson(r.tags || "[]", []) })), stats: statsObj, hours });
});

/** POST /api/news — trigger a real-time ingestion cycle now (signed-in users). */
export const POST = handler(async () => json(await ingestNews({})), { auth: "required", limit: "agentRun" });
