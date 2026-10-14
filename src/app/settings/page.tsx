"use client";

import { useEffect, useState } from "react";
import { attempt, toast } from "@/components/gc/toast";
import { Cpu, KeyRound, Link2, ShieldCheck, Trash2, Copy } from "lucide-react";
import { Panel, Btn, PageHeader } from "@/components/gc/ui";
import { useApi, postJson, copyText } from "@/components/gc/hooks";
import { cn } from "@/lib/utils";

interface Health { status: string; db: boolean; slm: { name: string; version: string; blindEval: Record<string, number> | null }; generative: { url: string; model: string; ok: boolean; models: string[] }; news: { lastIngestedAt: string | null; provenance: string | null }; agent: { lastRunAt: string | null; status: string | null; autorun: boolean }; version: string }
interface Levels { level: string; levels: Record<string, { name: string; description: string }> }

export default function Settings() {
  const health = useApi<Health>("/api/health");
  const autonomy = useApi<Levels>("/api/agent/autonomy");
  const hooks = useApi<{ endpoints: { id: string; url: string; events: string[]; lastStatus: number | null; secret: string }[] }>("/api/webhooks/endpoints");
  const keys = useApi<{ keys: { id: string; name: string; scopes: string[]; isActive: boolean; createdAt: string }[] }>("/api/developers/keys");
  const [hookUrl, setHookUrl] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const e = health.data?.slm.blindEval;

  return (
    <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-4">
      <PageHeader eyebrow="Workspace" title="Settings, integrations & AI" />
      {err && <p className="text-red-500 text-sm">{err}</p>}

      <Panel title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Agent autonomy policy</span>} subtitle="Applies to every automated cycle and automation rule in this workspace">
        <div className="grid sm:grid-cols-5 gap-2">
          {autonomy.data && Object.entries(autonomy.data.levels).map(([id, l]) => (
            <button key={id} onClick={async () => { try { await postJson("/api/agent/autonomy", { level: id }); autonomy.reload(); } catch (x) { setErr((x as Error).message); } }} className={cn("text-left rounded-xl border p-3 transition", autonomy.data!.level === id ? "border-[var(--gc-agent)] bg-[var(--gc-agent)]/10" : "gc-line hover:bg-[var(--gc-panel-2)]")}>
              <div className="font-display font-semibold">{id} · {l.name}</div>
              <div className="text-[11px] gc-muted mt-1 leading-snug">{l.description}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Cpu className="h-4 w-4" />AI & system status</span>} subtitle="Everything runs on your server — no external AI or API keys">
        {health.data && (
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="gc-panel-2 p-3">
              <div className="font-semibold">Chakra-Nano SLM <span className="gc-muted font-normal">v{health.data.slm.version}</span></div>
              <div className="text-xs gc-muted mt-1">In-house model trained from scratch · always on</div>
              {e && <ul className="text-xs mt-2 space-y-0.5"><li>Blind intent accuracy: <b>{(e.intentAccuracy * 100).toFixed(1)}%</b></li><li>Blind news-category accuracy: <b>{(e.categoryAccuracy * 100).toFixed(1)}%</b></li><li>Travel-relevance accuracy: <b>{(e.travelRelevanceAccuracy * 100).toFixed(1)}%</b></li><li>Severity within ±1: <b>{(e.severityWithinOne * 100).toFixed(1)}%</b></li></ul>}
            </div>
            <div className="gc-panel-2 p-3">
              <div className="font-semibold">Generative SLM (local, optional)</div>
              <div className={cn("text-xs mt-1 font-semibold", health.data.generative.ok ? "text-emerald-500" : "text-amber-500")}>{health.data.generative.ok ? `Connected · ${health.data.generative.model}` : "Not running — templates in use"}</div>
              <div className="text-xs gc-muted mt-1">Ollama at {health.data.generative.url}. Enable with <code className="font-mono">ollama create chakra -f slm/Modelfile</code>.</div>
            </div>
            <div className="gc-panel-2 p-3"><div className="font-semibold">Real-time news</div><div className="text-xs gc-muted mt-1">Last ingest: {health.data.news.lastIngestedAt ? new Date(health.data.news.lastIngestedAt).toLocaleString() : "never"} · {health.data.news.provenance === "sample" ? "drill feed (offline)" : "live"}</div></div>
            <div className="gc-panel-2 p-3"><div className="font-semibold">Autonomous scheduler</div><div className="text-xs gc-muted mt-1">{health.data.agent.autorun ? "Armed" : "Disabled (AGENT_AUTORUN=false)"} · last cycle {health.data.agent.lastRunAt ? new Date(health.data.agent.lastRunAt).toLocaleString() : "never"} ({health.data.agent.status ?? "—"})</div></div>
          </div>
        )}
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Link2 className="h-4 w-4" />Outbound webhooks</span>} subtitle="Push risk.exposure events into your booking engine, CRM or Slack bridge. HMAC-SHA256 signed (x-voyage-signature).">
        <form className="flex gap-2" onSubmit={async (ev) => { ev.preventDefault(); try { const r = await postJson<{ secret: string }>("/api/webhooks/endpoints", { url: hookUrl }); setSecret(r.secret); setHookUrl(""); hooks.reload(); } catch (x) { setErr((x as Error).message); } }}>
          <input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://your-system.example.com/voyage" className="flex-1 h-10 rounded-xl gc-panel-2 px-3 text-sm outline-none" aria-label="Webhook URL" />
          <Btn type="submit" disabled={!hookUrl}>Add</Btn>
        </form>
        {secret && <p className="mt-2 text-xs">Signing secret (shown once): <code className="font-mono break-all">{secret}</code></p>}
        <ul className="mt-3 space-y-2">{(hooks.data?.endpoints ?? []).map((h) => <li key={h.id} className="flex items-center gap-3 gc-panel-2 px-3 py-2 text-sm"><span className="flex-1 truncate font-mono text-xs">{h.url}</span><span className="text-xs gc-muted">last {h.lastStatus ?? "—"}</span><button aria-label="Delete webhook" onClick={async () => { await attempt(() => postJson(`/api/webhooks/endpoints?id=${h.id}`, undefined, "DELETE"), { success: "Webhook removed" }); hooks.reload(); }} className="text-red-500"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Partner API keys</span>} subtitle="Sell your risk intelligence: GET /api/v1/risk?place=… and the MCP endpoint /api/protocol/mcp">
        <form className="flex gap-2" onSubmit={async (ev) => { ev.preventDefault(); try { const r = await postJson<{ apiKey: string }>("/api/developers/keys", { name: keyName }); setNewKey(r.apiKey); setKeyName(""); keys.reload(); } catch (x) { setErr((x as Error).message); } }}>
          <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name, e.g. OTA production" className="flex-1 h-10 rounded-xl gc-panel-2 px-3 text-sm outline-none" aria-label="API key name" />
          <Btn type="submit" disabled={keyName.length < 2}>Create key</Btn>
        </form>
        {newKey && <div className="mt-2 text-xs flex items-center gap-2">Copy now: <code className="font-mono break-all">{newKey}</code><button onClick={async () => { const ok = await copyText(newKey); toast(ok ? "Key copied" : "Copy failed — select the key manually", ok ? "success" : "error"); }} aria-label="Copy key"><Copy className="h-3.5 w-3.5" /></button></div>}
        <ul className="mt-3 space-y-2">{(keys.data?.keys ?? []).map((k) => <li key={k.id} className="flex items-center gap-3 gc-panel-2 px-3 py-2 text-sm"><span className="flex-1">{k.name}</span><span className={cn("text-xs", k.isActive ? "text-emerald-500" : "text-red-500")}>{k.isActive ? "active" : "revoked"}</span>{k.isActive && <button className="text-xs text-red-500" onClick={async () => { await attempt(() => postJson(`/api/developers/keys?id=${k.id}`, undefined, "DELETE"), { success: "Key revoked" }); keys.reload(); }}>Revoke</button>}</li>)}</ul>
        <pre className="mt-3 gc-panel-2 p-3 text-[11px] font-mono overflow-x-auto">{`curl -H "Authorization: Bearer <key>" "${origin || "https://your-domain"}/api/v1/risk?place=Dubai"`}</pre>
      </Panel>
    </main>
  );
}
