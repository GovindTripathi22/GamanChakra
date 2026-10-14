"use client";

import { useState } from "react";
import { attempt } from "@/components/gc/toast";
import { Plus, Trash2, Workflow, Zap } from "lucide-react";
import { Panel, Btn, PageHeader, Empty, timeAgo } from "@/components/gc/ui";
import { useApi, postJson } from "@/components/gc/hooks";
import { CATEGORY_META, NEWS_CATEGORIES, SEVERITIES, type NewsCategory } from "@/lib/slm/labels";
import { cn } from "@/lib/utils";

interface Conditions { categories?: string[]; minSeverity?: string; minExposure?: number; countries?: string[]; keywords?: string[] }
interface Rule { id?: string; name: string; enabled: boolean; trigger: string; conditions: Conditions; actions: { type: string }[]; runCount?: number; lastRunAt?: string | null }
const ACTIONS = [
  { id: "notify", l: "Notify ops team" }, { id: "advisory", l: "Send traveller advisory (EN/HI)" }, { id: "checkin", l: "“Are you safe?” check-in" },
  { id: "reroute", l: "Prepare re-route options" }, { id: "reschedule", l: "Re-plan affected day" }, { id: "compensation_claim", l: "Draft compensation claim" },
  { id: "escalate", l: "Escalate to admins" }, { id: "webhook", l: "Signed partner webhook" }, { id: "hold_rebooking", l: "Sandbox seat hold" },
];

export default function Automations() {
  const { data, reload } = useApi<{ rules: Rule[]; templates: Rule[] }>("/api/automations");
  const [draft, setDraft] = useState<Rule>({ name: "", enabled: true, trigger: "news_event", conditions: { categories: [], minSeverity: "moderate", minExposure: 30 }, actions: [{ type: "notify" }] });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (r: Rule) => {
    setSaving(true); setErr(null);
    try {
      const c = { ...r.conditions };
      if (!c.categories?.length) delete c.categories;
      if (!c.countries?.length) delete c.countries;
      if (!c.keywords?.length) delete c.keywords;
      await postJson("/api/automations", { ...r, conditions: c });
      reload();
      setDraft({ ...draft, name: "" });
    } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  };
  const toggle = async (r: Rule) => { await attempt(() => postJson(`/api/automations/${r.id}`, { enabled: !r.enabled }, "PATCH"), { success: r.enabled ? "Rule paused" : "Rule enabled" }); reload(); };
  const remove = async (r: Rule) => { await attempt(() => postJson(`/api/automations/${r.id}`, undefined, "DELETE"), { success: "Rule deleted" }); reload(); };
  const c = draft.conditions;

  return (
    <main className="mx-auto max-w-[1280px] px-4 md:px-6 py-6">
      <PageHeader eyebrow="No-code automations" title="When the world changes, do this." description="Rules run inside every agent cycle, on top of the built-in expert playbooks. The autonomy level still decides whether an action runs instantly or waits for approval." />
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-3">
          {(data?.rules ?? []).map((r) => (
            <div key={r.id} className={cn("gc-panel p-4", !r.enabled && "opacity-60")}>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl grid place-items-center bg-[var(--gc-agent)]/15 text-[var(--gc-agent)] shrink-0"><Zap className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{r.name}</div>
                  <p className="text-sm gc-muted mt-1 leading-relaxed">
                    <b className="text-[var(--gc-text)]">When</b> {r.conditions.categories?.length ? r.conditions.categories.map((x) => CATEGORY_META[x as NewsCategory]?.label).join(" or ") : "any travel event"}
                    {r.conditions.minSeverity && <> with severity ≥ <b className="text-[var(--gc-text)]">{r.conditions.minSeverity}</b></>}
                    {r.conditions.minExposure != null && <> and exposure ≥ <b className="text-[var(--gc-text)]">{r.conditions.minExposure}</b></>}
                    {r.conditions.countries?.length ? <> in {r.conditions.countries.join(", ")}</> : null}
                    {r.conditions.keywords?.length ? <> mentioning “{r.conditions.keywords.join("”, “")}”</> : null}
                    , <b className="text-[var(--gc-text)]">then</b> {r.actions.map((a) => ACTIONS.find((x) => x.id === a.type)?.l ?? a.type).join(" → ")}.
                  </p>
                  <div className="text-[11px] gc-muted mt-2">Fired {r.runCount ?? 0}×{r.lastRunAt ? ` · last ${timeAgo(r.lastRunAt)}` : ""}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button role="switch" aria-checked={r.enabled} aria-label={`Toggle ${r.name}`} onClick={() => toggle(r)} className={cn("h-6 w-11 rounded-full relative transition", r.enabled ? "bg-[var(--gc-safe)]" : "bg-[var(--gc-panel-2)] border gc-line")}><span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", r.enabled ? "left-[22px]" : "left-0.5")} /></button>
                  <button aria-label={`Delete ${r.name}`} onClick={() => remove(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {(data?.rules ?? []).length === 0 && <div className="gc-panel"><Empty icon={<Workflow className="h-6 w-6" />} title="No rules yet">Start from a template on the right.</Empty></div>}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <Panel title="Build a rule">
            <div className="space-y-3 text-sm">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Rule name, e.g. Gulf flight chaos" className="w-full h-10 rounded-xl gc-panel-2 px-3 outline-none" aria-label="Rule name" />
              <div>
                <div className="text-xs font-semibold gc-muted mb-1.5">WHEN event category is</div>
                <div className="flex flex-wrap gap-1.5">
                  {NEWS_CATEGORIES.filter((x) => x !== "not_travel").map((k) => {
                    const on = c.categories?.includes(k);
                    return <button key={k} onClick={() => setDraft({ ...draft, conditions: { ...c, categories: on ? c.categories!.filter((x) => x !== k) : [...(c.categories ?? []), k] } })} className={cn("rounded-full px-2.5 py-1 text-[11px] border", on ? "border-current font-semibold" : "gc-line gc-muted")} style={on ? { color: CATEGORY_META[k].color } : undefined}>{CATEGORY_META[k].label}</button>;
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs gc-muted">Min severity
                  <select value={c.minSeverity} onChange={(e) => setDraft({ ...draft, conditions: { ...c, minSeverity: e.target.value } })} className="mt-1 w-full h-9 rounded-lg gc-panel-2 px-2 text-sm text-[var(--gc-text)]">{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select>
                </label>
                <label className="text-xs gc-muted">Min exposure: <b className="text-[var(--gc-text)]">{c.minExposure}</b>
                  <input type="range" min={0} max={100} step={5} value={c.minExposure} onChange={(e) => setDraft({ ...draft, conditions: { ...c, minExposure: Number(e.target.value) } })} className="mt-2 w-full accent-[var(--gc-brand)]" />
                </label>
              </div>
              <input placeholder="Countries (ISO codes, comma separated) e.g. AE, TH" onChange={(e) => setDraft({ ...draft, conditions: { ...c, countries: e.target.value.split(",").map((x) => x.trim().toUpperCase()).filter((x) => x.length === 2) } })} className="w-full h-9 rounded-lg gc-panel-2 px-3 outline-none" aria-label="Countries" />
              <input placeholder="Keywords (optional) e.g. airport, IndiGo" onChange={(e) => setDraft({ ...draft, conditions: { ...c, keywords: e.target.value.split(",").map((x) => x.trim()).filter((x) => x.length > 1) } })} className="w-full h-9 rounded-lg gc-panel-2 px-3 outline-none" aria-label="Keywords" />
              <div>
                <div className="text-xs font-semibold gc-muted mb-1.5">THEN</div>
                <div className="grid grid-cols-1 gap-1">
                  {ACTIONS.map((a) => {
                    const on = draft.actions.some((x) => x.type === a.id);
                    return <label key={a.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={on} onChange={() => setDraft({ ...draft, actions: on ? draft.actions.filter((x) => x.type !== a.id) : [...draft.actions, { type: a.id }] })} className="accent-[var(--gc-agent)]" />{a.l}</label>;
                  })}
                </div>
              </div>
              {err && <p className="text-red-500 text-xs">{err}</p>}
              <Btn className="w-full" loading={saving} disabled={draft.name.length < 3 || !draft.actions.length} onClick={() => save(draft)}><Plus className="h-4 w-4" />Create rule</Btn>
            </div>
          </Panel>
          <Panel title="Templates" subtitle="Battle-tested starting points">
            <ul className="space-y-2">
              {(data?.templates ?? []).map((t) => (
                <li key={t.name} className="flex items-center gap-3 gc-panel-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium">{t.name}</div><div className="text-[11px] gc-muted truncate">{t.actions.map((a) => a.type.replace("_", " ")).join(" · ")}</div></div>
                  <Btn size="sm" variant="outline" onClick={() => save({ ...t, enabled: true })}>Add</Btn>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </main>
  );
}
