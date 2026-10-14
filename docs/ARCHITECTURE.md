# Voyage v3 — Architecture

```
                    ┌──────────────────────── keyless public sources ────────────────────────┐
                    │ GDELT · USGS · GDACS · Google News RSS (+ per-destination watch) · BBC │
                    │ Al Jazeera · The Hindu · TOI · ReliefWeb · your NEWS_EXTRA_FEEDS        │
                    └───────────────────────────────┬─────────────────────────────────────────┘
                                                    │ fetch (parallel, 9 s timeout)
┌──────────── SENSE ─────────────┐  parsers.ts → normalizeArticle() → dedupe() → NewsEvent
│ src/lib/news/pipeline.ts       │      │ Chakra-Nano classify (category, severity)
└────────────────────────────────┘      │ gazetteer geotag (272 cities, 250 countries, IATA)
                                        │ impactScore = weight × severity × confidence × recency × geo × reliability
┌──────────── THINK ─────────────┐
│ src/lib/risk/engine.ts         │  loadSubjects() (travellers + trips) × recentEvents(72 h)
│                                │  exposureScore = impact × distance-decay × time-overlap → RiskAssessment
└────────────────────────────────┘
┌──────────── PLAN ──────────────┐
│ agent/playbooks.ts             │  expert response per category × band
│ agent/automations.ts           │  + org no-code rules (zod-validated)
│ agent/runner.ts                │  idempotency key = sha1(kind|subject|event)
└────────────────────────────────┘
┌──────────── ACT ───────────────┐
│ agent/policy.ts                │  L0 record · L1 notify · L2 propose · L3 act (reversible) · L4 autopilot (sandbox)
│ agent/executor.ts              │  advisory (EN/HI) · notify · escalate · check-in link + wa.me · re-route
│                                │  · re-schedule · compensation claim · sandbox seat hold · signed webhook
└────────────────────────────────┘
┌──────────── REFLECT ───────────┐
│ AgentRun / AgentStep           │  every step persisted with tool input/output; summary (template or local SLM)
└────────────────────────────────┘
         │ publish()                         ▲ approve/reject (human-in-the-loop)
         ▼                                   │
  events/bus.ts  ──► SystemEvent table ──► /api/stream (SSE, cursor-polled → multi-instance safe) ──► UI
```

## Intelligence tiers
1. **Chakra-Nano** (`src/lib/slm`) — always on. Featurizer: entity masking (places → `zplace`, numbers → `znum`), word uni/bi-grams, char trigrams, domain-lexicon features; FNV-1a hashing into 16 384 buckets; 32-d EmbeddingBag; heads for intent / category / severity. Trained with SGD + linear LR decay on ~4.6 k examples; int8 export with per-row scales. Severity is corrected by deterministic evidence rules (magnitude, casualties, alert colours).
2. **Slot filler** (`slots.ts`) — origin/destination (EN, Hinglish, Devanagari), days, ₹ budgets (k / lakh / crore), travellers, currency pairs, flight/train numbers, autonomy level, page, phrase/language.
3. **Generative SLM** (`generative.ts`) — optional Ollama; used for phrasing only (advisories, briefings, day themes, control-tower JSON). Falls back silently.

## Request flow — voice
Browser Web Speech (STT, wake word) → `POST /api/jarvis` → `classifyIntent` + `extractSlots` → tool (risk engine, news DB, alternatives, claims, FX, phrasebook, planner, agent) → reply + speakable text + cards (+ navigate) → browser `speechSynthesis` (voice chosen per language).

## Data model (Prisma)
Original models kept (Trip, TripItem, Verification, CostLine, Alert, Action, AuditEvent, GroupRoom…, World*, Execution*, Exchange*, Identity*, Financial*, DestinationMetric). New: `Organization`, `User`, `Traveler`, `CheckinRequest`, `NewsEvent`, `RiskAssessment`, `AgentRun`, `AgentStep`, `AgentTask`, `Notification`, `AutomationRule`, `WebhookEndpoint`, `SystemEvent`.

## Security
scrypt password hashing; HMAC-SHA256 stateless sessions (`AUTH_SECRET`, revocable via `sessionVersion`); httpOnly SameSite=Lax cookies, Secure on HTTPS; route protection in `src/proxy.ts`; per-route roles; token-bucket rate limits; zod validation everywhere; org isolation on every query; check-in links are unguessable 144-bit tokens with 48 h expiry; partner keys stored as SHA-256; outbound webhooks signed `t=…,v1=HMAC(secret, t.body)`; security headers in `next.config.ts`.

## Scaling
- Web tier is stateless → run N instances behind a load balancer; set `AGENT_AUTORUN=false` and run one `npm run worker`.
- Switch SQLite → PostgreSQL by changing the Prisma provider.
- News fetching is O(sources) per cycle; risk matching is O(events × subjects) in-memory (≈ 1 500 × 5 000 in well under a second); add a geo index (PostGIS) beyond ~100 k travellers.
- SSE uses DB cursors, so any instance can serve any client.
