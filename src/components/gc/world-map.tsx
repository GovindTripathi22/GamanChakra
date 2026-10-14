"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";
import { CATEGORY_META, type NewsCategory } from "@/lib/slm/labels";
import { SafeBoundary } from "./error-boundary";

export interface MapEvent { id: string; title: string; category: string; severity: string; impactScore: number; lat: number | null; lng: number | null; placeName?: string | null; radiusKm?: number; provenance?: string }
export interface MapPoint { id: string; label: string; lat: number; lng: number; score: number; status?: string }

const W = 960, H = 500;
/** Keep at least half the map on screen whatever the zoom. */
function clampPan(k: number, x: number, y: number) {
  return { x: Math.min(W * 0.5, Math.max(W * 0.5 - W * k, x)), y: Math.min(H * 0.5, Math.max(H * 0.5 - H * k, y)) };
}
const countries = feature(world as unknown as Topology, (world as unknown as Topology).objects.countries as GeometryCollection) as unknown as FeatureCollection<Geometry>;

/**
 * Offline vector world map (no tile server, no API): Natural Earth projection rendered to SVG.
 * Events pulse by severity; travellers glow by exposure. Drag to pan, wheel/buttons to zoom.
 */
function WorldMapInner({ events = [], points = [], height = 420, onSelect, focus }: { events?: MapEvent[]; points?: MapPoint[]; height?: number; onSelect?: (e: MapEvent) => void; focus?: { lat: number; lng: number } | null }) {
  const projection = useMemo(() => geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const land = useMemo(() => countries.features.map((f, i) => ({ d: path(f) ?? "", k: i })), [path]);
  const grat = useMemo(() => path(geoGraticule10()) ?? "", [path]);
  const sphere = useMemo(() => path({ type: "Sphere" }) ?? "", [path]);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<{ x: number; y: number; text: string; sub?: string } | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const zoomTo = (k: number, cx = W / 2, cy = H / 2) => setView((v) => {
    const nk = Math.max(1, Math.min(8, Number.isFinite(k) ? k : v.k));
    if (nk === 1) return { k: 1, x: 0, y: 0 };
    return { k: nk, ...clampPan(nk, cx - ((cx - v.x) * nk) / v.k, cy - ((cy - v.y) * nk) / v.k) };
  });
  useEffect(() => {
    if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return;
    const p = projection([focus.lng, focus.lat]);
    if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) setView({ k: 3, ...clampPan(3, W / 2 - p[0] * 3, H / 2 - p[1] * 3) });
  // depend on the numbers, not the object identity (callers often pass a fresh object each render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.lat, focus?.lng, projection]);

  const toLocal = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    const r = el?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return { x: W / 2, y: H / 2 };
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };
  const endDrag = (ev?: React.PointerEvent<SVGSVGElement>) => {
    if (ev) { try { ev.currentTarget.releasePointerCapture?.(ev.pointerId); } catch { /* not captured */ } }
    drag.current = null;
  };
  const evDots = (events ?? []).filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng) && e.category !== "not_travel").map((e) => {
    const p = projection([e.lng!, e.lat!]);
    return p ? { e, x: p[0], y: p[1] } : null;
  }).filter(Boolean) as { e: MapEvent; x: number; y: number }[];
  const ptDots = (points ?? []).filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng)).map((pt) => { const p = projection([pt.lng, pt.lat]); return p ? { pt, x: p[0], y: p[1] } : null; }).filter(Boolean) as { pt: MapPoint; x: number; y: number }[];
  const inv = 1 / view.k;

  return (
    <div className="relative w-full select-none" style={{ height }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
        role="img"
        aria-label="Live world risk map"
        onWheel={(ev) => {
          // Ctrl/⌘ + wheel zooms; plain wheel keeps scrolling the page (no scroll hijacking).
          if (!ev.ctrlKey && !ev.metaKey) return;
          const p = toLocal(ev.clientX, ev.clientY);
          zoomTo(view.k * (ev.deltaY < 0 ? 1.25 : 0.8), p.x, p.y);
        }}
        onPointerDown={(ev) => {
          if (ev.button !== 0) return;
          try { ev.currentTarget.setPointerCapture?.(ev.pointerId); } catch { /* unsupported */ }
          const p = toLocal(ev.clientX, ev.clientY);
          drag.current = { x: p.x, y: p.y, vx: view.x, vy: view.y };
        }}
        onPointerMove={(ev) => {
          const d = drag.current; // snapshot: the ref can be cleared before React runs the updater
          if (!d) return;
          const p = toLocal(ev.clientX, ev.clientY);
          const nx = d.vx + (p.x - d.x);
          const ny = d.vy + (p.y - d.y);
          if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
          setView((v) => ({ ...v, ...clampPan(v.k, nx, ny) }));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(ev) => { endDrag(ev); setHover(null); }}
      >
        <defs>
          <radialGradient id="gc-ev-glow"><stop offset="0%" stopColor="#fff" stopOpacity=".9" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <path d={sphere} fill="var(--gc-sea)" stroke="var(--gc-line)" strokeWidth={inv} />
          <path d={grat} fill="none" stroke="var(--gc-line)" strokeWidth={0.6 * inv} />
          {land.map((l) => <path key={l.k} d={l.d} fill="var(--gc-land)" stroke="var(--gc-land-line)" strokeWidth={0.5 * inv} />)}
          {evDots.map(({ e, x, y }) => {
            const meta = CATEGORY_META[e.category as NewsCategory];
            const color = meta?.color ?? "#94a3b8";
            const r = (2.5 + (Math.max(0, Math.min(100, e.impactScore || 0)) / 100) * 5) * Math.max(0.55, inv);
            const pulse = e.severity === "high" || e.severity === "critical";
            return (
              <g key={e.id} className="cursor-pointer" onClick={() => onSelect?.(e)}
                onMouseEnter={(ev) => { const p = toLocal(ev.clientX, ev.clientY); setHover({ x: p.x, y: p.y, text: e.title.replace(/^drill:\s*/i, ""), sub: `${meta?.label ?? e.category} · ${e.severity} · impact ${e.impactScore}${e.placeName ? ` · ${e.placeName}` : ""}` }); }}
                onMouseLeave={() => setHover(null)}>
                {pulse && <circle cx={x} cy={y} r={3} fill="none" stroke={color} strokeWidth={1.2 * inv} className="gc-pulse" />}
                <circle cx={x} cy={y} r={r * 1.9} fill={color} opacity={0.18} />
                <circle cx={x} cy={y} r={r} fill={color} stroke="var(--gc-panel)" strokeWidth={0.8 * inv} />
              </g>
            );
          })}
          {ptDots.map(({ pt, x, y }) => {
            const c = pt.status === "needs_help" ? "var(--gc-crit)" : pt.score >= 55 ? "#f97316" : pt.score >= 35 ? "var(--gc-warn)" : pt.status === "safe" ? "var(--gc-safe)" : "#38bdf8";
            return (
              <g key={pt.id}
                onMouseEnter={(ev) => { const p = toLocal(ev.clientX, ev.clientY); setHover({ x: p.x, y: p.y, text: pt.label, sub: `exposure ${pt.score}/100${pt.status ? ` · ${pt.status.replace("_", " ")}` : ""}` }); }}
                onMouseLeave={() => setHover(null)}>
                <rect x={x - 3.2 * inv} y={y - 3.2 * inv} width={6.4 * inv} height={6.4 * inv} rx={1.6 * inv} fill={c} stroke="var(--gc-panel)" strokeWidth={0.9 * inv} transform={`rotate(45 ${x} ${y})`} />
              </g>
            );
          })}
        </g>
      </svg>
      {hover && (
        <div className="pointer-events-none absolute z-10 max-w-[280px] rounded-xl gc-panel px-3 py-2 text-xs shadow-xl" style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%`, transform: "translate(-50%, calc(-100% - 12px))" }}>
          <div className="font-medium leading-snug">{hover.text}</div>
          {hover.sub && <div className="gc-muted mt-0.5">{hover.sub}</div>}
        </div>
      )}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button aria-label="Zoom in" onClick={() => zoomTo(view.k * 1.5)} className="h-8 w-8 rounded-lg gc-panel text-sm font-semibold hover:brightness-110">+</button>
        <button aria-label="Zoom out" onClick={() => zoomTo(view.k / 1.5)} className="h-8 w-8 rounded-lg gc-panel text-sm font-semibold hover:brightness-110">−</button>
        <span className="sr-only">Hold Ctrl or ⌘ and scroll to zoom; drag to pan.</span>
        <button aria-label="Reset view" onClick={() => setView({ k: 1, x: 0, y: 0 })} className="h-8 w-8 rounded-lg gc-panel text-[10px] font-semibold hover:brightness-110">⟲</button>
      </div>
    </div>
  );
}

/** Public map component: wrapped in an error boundary so a rendering fault never takes down the page. */
export function WorldMap(props: Parameters<typeof WorldMapInner>[0]) {
  // Client-only render: the projected SVG is computed in the browser, so server HTML can never mismatch it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return <div className="w-full animate-pulse rounded-xl bg-[var(--gc-panel-2)]" style={{ height: props.height ?? 420 }} aria-label="Loading world map" role="img" />;
  }
  return (
    <SafeBoundary label="The map" minHeight={props.height ?? 420}>
      <WorldMapInner {...props} />
    </SafeBoundary>
  );
}
