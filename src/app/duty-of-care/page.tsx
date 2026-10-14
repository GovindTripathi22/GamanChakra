"use client";

import { useMemo, useState } from "react";
import { toast } from "@/components/gc/toast";
import { Download, MessageCircle, Plus, Send, ShieldCheck, Upload, Users, Copy, Check } from "lucide-react";
import { Panel, Stat, Btn, PageHeader, Empty, timeAgo } from "@/components/gc/ui";
import { useApi, useEventStream, postJson, copyText } from "@/components/gc/hooks";
import { WorldMap } from "@/components/gc/world-map";
import { cn } from "@/lib/utils";

interface Traveler {
  id: string; name: string; email: string | null; phone: string | null; department: string | null; homeCity: string | null;
  destinationCity: string; destLat: number; destLng: number; tripStart: string; tripEnd: string; transportMode: string;
  safetyStatus: "unknown" | "safe" | "needs_help" | "unreachable"; exposureScore: number; lastCheckinAt: string | null;
  pendingCheckin: { token: string; createdAt: string } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  safe: { label: "Safe", cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  needs_help: { label: "Needs help", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  unknown: { label: "Unconfirmed", cls: "bg-slate-500/12 gc-muted" },
  unreachable: { label: "Unreachable", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};
const FILTERS = [{ id: "all", l: "All" }, { id: "exposed", l: "Exposed" }, { id: "needs_help", l: "Needs help" }, { id: "pending", l: "Awaiting reply" }, { id: "traveling", l: "Travelling now" }];

export default function DutyOfCare() {
  const { data, reload, loading } = useApi<{ travelers: Traveler[] }>("/api/travelers", { refreshMs: 30000 });
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [links, setLinks] = useState<Record<string, { link?: string; whatsappLink?: string | null }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useEventStream((e) => { if (e.type === "checkin.update" || e.type === "agent.run") reload(); });

  const now = Date.now();
  const list = useMemo(() => (data?.travelers ?? []).filter((t) => {
    if (q && !`${t.name} ${t.destinationCity} ${t.department ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "exposed") return t.exposureScore >= 35;
    if (filter === "needs_help") return t.safetyStatus === "needs_help";
    if (filter === "pending") return !!t.pendingCheckin && t.safetyStatus === "unknown";
    if (filter === "traveling") return new Date(t.tripStart).getTime() <= now && new Date(t.tripEnd).getTime() >= now;
    return new Date(t.tripEnd).getTime() >= now - 864e5;
  }), [data, filter, q, now]);
  const all = data?.travelers ?? [];
  const stats = { total: all.length, exposed: all.filter((t) => t.exposureScore >= 35).length, safe: all.filter((t) => t.safetyStatus === "safe").length, help: all.filter((t) => t.safetyStatus === "needs_help").length, pending: all.filter((t) => t.pendingCheckin && t.safetyStatus === "unknown").length };

  const checkin = async (ids: string[]) => {
    if (!ids.length) return;
    if (sending) return;
    setSending(true);
    try {
      const r = await postJson<{ results: { travelerId: string; link?: string; whatsappLink?: string | null }[] }>("/api/checkins/bulk", { travelerIds: ids });
      setLinks((l) => ({ ...l, ...Object.fromEntries(r.results.map((x) => [x.travelerId, x])) }));
      setSel(new Set());
      toast(`Check-in sent to ${r.results.length} traveller${r.results.length === 1 ? "" : "s"}`, "success");
      reload();
    } catch (e) { toast((e as Error).message, "error"); } finally { setSending(false); }
  };
  const exportCsv = () => {
    const rows = [["name", "department", "destination", "tripStart", "tripEnd", "exposure", "status", "lastCheckin"], ...all.map((t) => [t.name, t.department ?? "", t.destinationCity, t.tripStart.slice(0, 10), t.tripEnd.slice(0, 10), t.exposureScore, t.safetyStatus, t.lastCheckinAt ?? ""])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `duty-of-care-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 md:px-6 py-6">
      <PageHeader eyebrow="B2B · Duty of care" title="Every traveller, accounted for." description="Exposure is recomputed every agent cycle from live news. Send one-tap “Are you safe?” check-ins by link or WhatsApp — replies land here in real time."
        actions={<>
          <Btn variant="outline" onClick={() => setShowImport(!showImport)}><Upload className="h-4 w-4" />Import CSV</Btn>
          <Btn variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export</Btn>
          <Btn onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4" />Add traveller</Btn>
        </>} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Stat label="Active travellers" value={stats.total} icon={<Users className="h-4 w-4" />} />
        <Stat label="Exposed" value={stats.exposed} tone="warn" hint="exposure ≥ 35" />
        <Stat label="Confirmed safe" value={stats.safe} tone="safe" />
        <Stat label="Awaiting reply" value={stats.pending} tone="brand" />
        <Stat label="Need help" value={stats.help} tone={stats.help ? "crit" : "default"} />
      </div>

      {showAdd && <AddTraveler onDone={() => { setShowAdd(false); reload(); }} />}
      {showImport && <ImportCsv onDone={() => { setShowImport(false); reload(); }} />}

      <div className="grid xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-5" pad={false} title="Where everyone is" subtitle="◆ colour = exposure / status">
          <WorldMap points={all.map((t) => ({ id: t.id, label: `${t.name} · ${t.destinationCity}`, lat: t.destLat, lng: t.destLng, score: t.exposureScore, status: t.safetyStatus }))} height={380} />
        </Panel>
        <Panel className="xl:col-span-7" pad={false} title="Traveller roster" subtitle={`${list.length} shown`} action={
          <Btn size="sm" variant="agent" disabled={!sel.size} loading={sending} onClick={() => checkin([...sel])}><Send className="h-3.5 w-3.5" />Check in {sel.size || ""}</Btn>
        }>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b gc-line">
            {FILTERS.map((f) => <button key={f.id} onClick={() => setFilter(f.id)} className={cn("rounded-full px-3 py-1 text-xs font-medium border", filter === f.id ? "border-[var(--gc-brand)] text-[var(--gc-brand)]" : "gc-line gc-muted")}>{f.l}</button>)}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city, team…" className="ml-auto h-8 w-48 rounded-lg gc-panel-2 px-3 text-xs outline-none" aria-label="Search travellers" />
          </div>
          <div className="overflow-x-auto gc-scroll max-h-[560px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--gc-panel)] z-[1]">
                <tr className="text-left text-[11px] uppercase tracking-wider gc-muted">
                  <th className="px-4 py-2.5 w-8"><input type="checkbox" aria-label="Select all" checked={sel.size > 0 && sel.size === list.length} onChange={(e) => setSel(e.target.checked ? new Set(list.map((t) => t.id)) : new Set())} className="accent-[var(--gc-brand)]" /></th>
                  <th className="py-2.5">Traveller</th><th className="py-2.5">Destination</th><th className="py-2.5">Exposure</th><th className="py-2.5">Status</th><th className="py-2.5 pr-4 text-right">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gc-line)]">
                {list.map((t) => {
                  const l = links[t.id];
                  const link = l?.link ?? (t.pendingCheckin ? `${typeof window !== "undefined" ? window.location.origin : ""}/checkin/${t.pendingCheckin.token}` : null);
                  return (
                    <tr key={t.id} className={cn("hover:bg-[var(--gc-panel-2)]", t.safetyStatus === "needs_help" && "bg-red-500/5")}>
                      <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Select ${t.name}`} checked={sel.has(t.id)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(t.id); else s.delete(t.id); setSel(s); }} className="accent-[var(--gc-brand)]" /></td>
                      <td className="py-2.5"><div className="font-medium">{t.name}</div><div className="text-[11px] gc-muted">{t.department ?? "—"} · {t.transportMode}</div></td>
                      <td className="py-2.5"><div>{t.destinationCity}</div><div className="text-[11px] gc-muted">{new Date(t.tripStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(t.tripEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div></td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-[var(--gc-panel-2)] overflow-hidden"><div className="h-full" style={{ width: `${t.exposureScore}%`, background: t.exposureScore >= 55 ? "var(--gc-crit)" : t.exposureScore >= 35 ? "var(--gc-warn)" : "var(--gc-safe)" }} /></div>
                          <span className="tabular-nums text-xs">{t.exposureScore}</span>
                        </div>
                      </td>
                      <td className="py-2.5"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[t.safetyStatus]?.cls)}>{STATUS[t.safetyStatus]?.label}</span>{t.lastCheckinAt && <div className="text-[10px] gc-muted mt-0.5">{timeAgo(t.lastCheckinAt)}</div>}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex justify-end gap-1">
                          {link && <button title="Copy check-in link" onClick={async () => { if (await copyText(link)) { setCopied(t.id); setTimeout(() => setCopied(null), 1500); } else toast("Couldn't access the clipboard — long-press the link to copy.", "error"); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel)]">{copied === t.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</button>}
                          {(l?.whatsappLink || (t.phone && link)) && <a title="Send on WhatsApp" target="_blank" rel="noreferrer" href={l?.whatsappLink ?? `https://wa.me/${t.phone!.replace(/\D/g, "")}?text=${encodeURIComponent(`Voyage safety check — tap to confirm you're safe: ${link}`)}`} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel)] text-emerald-500"><MessageCircle className="h-4 w-4" /></a>}
                          <button title="Send check-in" onClick={() => checkin([t.id])} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[var(--gc-panel)] text-[var(--gc-agent)]"><Send className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && list.length === 0 && <Empty icon={<ShieldCheck className="h-6 w-6" />} title="No travellers match">Add travellers or import a CSV to start monitoring.</Empty>}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function AddTraveler({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", department: "", homeCity: "", destinationCity: "", tripStart: new Date().toISOString().slice(0, 10), tripEnd: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), transportMode: "flight" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inp = "h-10 rounded-xl gc-panel-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--gc-brand)]/40";
  return (
    <Panel className="mb-4" title="Add traveller">
      <form className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(null); try { await postJson("/api/travelers", f); onDone(); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } }}>
        <input className={inp} placeholder="Full name *" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inp} placeholder="Destination city *" required value={f.destinationCity} onChange={(e) => setF({ ...f, destinationCity: e.target.value })} />
        <input className={inp} type="date" aria-label="Trip start" value={f.tripStart} onChange={(e) => setF({ ...f, tripStart: e.target.value })} />
        <input className={inp} type="date" aria-label="Trip end" value={f.tripEnd} onChange={(e) => setF({ ...f, tripEnd: e.target.value })} />
        <select className={inp} value={f.transportMode} onChange={(e) => setF({ ...f, transportMode: e.target.value })} aria-label="Transport mode"><option value="flight">Flight</option><option value="train">Train</option><option value="bus">Bus</option><option value="car">Car</option></select>
        <input className={inp} placeholder="Phone (+91…)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className={inp} placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={inp} placeholder="Department" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} />
        <input className={inp} placeholder="Home city" value={f.homeCity} onChange={(e) => setF({ ...f, homeCity: e.target.value })} />
        <Btn type="submit" loading={busy}>Save traveller</Btn>
        {err && <p className="text-sm text-red-500 sm:col-span-2 lg:col-span-5">{err}</p>}
      </form>
    </Panel>
  );
}

function ImportCsv({ onDone }: { onDone: () => void }) {
  const sample = "name,email,phone,department,homeCity,destinationCity,tripStart,tripEnd,transportMode\nAsha Rao,asha@acme.com,+919800000000,Sales,Mumbai,Singapore,2026-10-20,2026-10-24,flight";
  const [text, setText] = useState(sample);
  const [res, setRes] = useState<{ created: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Panel className="mb-4" title="Import travellers from CSV" subtitle="Paste from your HRMS / booking tool export, or choose a file">
      <input type="file" accept=".csv,text/csv" className="text-sm mb-2" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setText(await file.text()); }} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full rounded-xl gc-panel-2 p-3 font-mono text-xs outline-none" aria-label="CSV content" />
      <div className="flex items-center gap-3 mt-2">
        <Btn loading={busy} disabled={!text.trim()} onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/travelers/import", { method: "POST", body: text });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error ?? `Import failed (${r.status})`);
            setRes({ created: Number(j.created) || 0, errors: Array.isArray(j.errors) ? j.errors : [] });
            if (j.created) setTimeout(onDone, 1200);
          } catch (e) { toast((e as Error).message === "Failed to fetch" ? "Network unavailable" : (e as Error).message, "error"); }
          finally { setBusy(false); }
        }}>Import</Btn>
        {res && <span className="text-sm">{res.created} imported{res.errors?.length ? ` · ${res.errors.length} skipped (${res.errors[0]})` : ""}</span>}
      </div>
    </Panel>
  );
}
