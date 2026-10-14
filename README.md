# 🎡 Voyage v3
### The autonomous travel-risk OS — real-time world news, an in-house SLM, a voice co-pilot, and an agent that protects every traveller.

**Zero API keys. Zero cloud-AI bills. Self-hostable.**

Voyage reads the world's news as it breaks, understands it with **Chakra-Nano** (a small language model trained from scratch in this repo), matches every event against every trip and traveller, and an **autonomous agent** responds inside the policy you set — advisories, “Are you safe?” check-ins, re-routes, compensation claims, partner webhooks. Talk to it: **“Hey Chakra, is Bangkok safe this week?”** in English, Hindi or Hinglish.

---

## Quick start (Windows / macOS / Linux)

```bash
npm install          # installs deps + generates the Prisma client
npm run setup        # writes .env with locally generated secrets, creates the database
npm run dev          # http://localhost:3000  → click “Launch the live demo”
```

Production: `npm run build && npm start` (or `docker compose up -d`). That's it — no Gemini, Clerk, Stripe, Arcjet or news-API keys.

> **Offline?** If the server can't reach the internet, the news engine switches to a clearly-labelled **DRILL** feed (every title starts with “Drill:” and carries a purple DRILL badge) so you can still demo the whole loop. As soon as it's online, the next cycle uses the live sources.

---

## What's inside

| Area | What it does |
|---|---|
| **Real-time world news engine** | GDELT 2.0, USGS earthquakes, GDACS (UN/EU disaster alerts), Google News RSS (global + a dedicated watch-list per active destination), BBC, Al Jazeera, The Hindu, Times of India, ReliefWeb. All keyless. Parsed → classified → geotagged → impact-scored → de-duplicated → stored → streamed. |
| **Chakra-Nano SLM** | Multi-task neural model (hashed n-grams + domain lexicon → EmbeddingBag → 3 softmax heads): 21 voice intents, 12 risk categories, 4 severities. ~0.5 M params, int8, < 1 ms on CPU. Blind-set: **96.4 % intent · 94.6 % travel-relevance · 82.1 % 12-way category · 96.4 % severity ±1**. See [`slm/MODEL_CARD.md`](slm/MODEL_CARD.md). |
| **Generative SLM (optional)** | Qwen 2.5 / Llama 3.2 (1–3 B) served locally by **Ollama** with our `slm/Modelfile`; LoRA fine-tuning kit + 1,566-example SFT dataset exported from the repo corpus. Only rephrases; never decides. |
| **Autonomous agent** | SENSE → THINK → PLAN → ACT → REFLECT every `AGENT_INTERVAL_MIN` minutes (built-in scheduler, or `npm run worker`, or `/api/cron/agent`). Expert playbooks + your no-code rules. Five autonomy levels (L0 Observe → L4 Autopilot). Idempotent, fully traced, human-in-the-loop approvals inbox. |
| **Jarvis voice co-pilot** | Floating orb on every page. Push-to-talk, wake word (“Hey Chakra” / “Jarvis”), spoken replies, EN/HI, rich cards (risk, news, routes, claims, phrases, travellers…). `Ctrl/⌘ + J`. |
| **Mission Control** | Live KPIs, offline vector world map, real-time feed with filters, agent thought stream (SSE), approvals inbox, destination risk leaderboard, autonomy switch. |
| **Duty of Care (B2B)** | Traveller roster + map, exposure per traveller, CSV import/export, mass check-ins via one-tap link or WhatsApp deep link, live replies, “needs help” escalation. |
| **Risk Radar** | Public 0–100 live destination risk with explainable drivers + SLM playground. |
| **Claims centre** | DGCA CAR (India), EU261, UK261, US DOT entitlement estimates + claim letter. Run automatically for every cancellation/delay the agent detects. |
| **Keyless trip planner** | Offline knowledge base (15 destinations, 110 curated POIs) + geo engine for anywhere else: crowd-aware slotting, geographic clustering, honest cost ranges. Existing trip pages, PDF export, group room, emergency pass and waitlist rescue all retained. |
| **Platform** | Self-hosted auth (scrypt + HMAC sessions), orgs & roles, rate limiting, security headers, signed outbound webhooks, partner Risk API (`/api/v1/risk`) + MCP endpoint, UPI billing (QR + intent link), PWA. |

---

## Scripts

| Command | |
|---|---|
| `npm run setup` | Create `.env` (local secrets) and the database |
| `npm run dev` / `build` / `start` | Next.js 16 |
| `npm run worker` | Standalone autonomous agent worker (set `AGENT_AUTORUN=false` on web instances) |
| `npm test` | 122 unit + integration tests (Vitest) |
| `npm run test:e2e` | 11 Playwright end-to-end journeys (desktop + mobile) |
| `npm run test:legacy` | The original 73-check platform verification suite |
| `npm run slm:train` | Retrain Chakra-Nano from the corpus (~3 s) and regenerate the model card |
| `npm run slm:export-sft` | Export the SFT dataset for the generative SLM |
| `npm run ci` | typecheck → lint → test → build |

## Configuration

Everything optional except what `npm run setup` writes. See [`.env.example`](.env.example). Notable:
`NEWS_MODE=auto|live|drill`, `NEWS_EXTRA_FEEDS`, `AGENT_INTERVAL_MIN`, `OLLAMA_URL`/`OLLAMA_MODEL`, `MERCHANT_VPA` (your UPI ID for upgrades).

**PostgreSQL:** set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at it, `npx prisma db push`. Run N stateless web instances + 1 worker; the SSE stream syncs across instances through the `SystemEvent` table.

## Docs
- [Architecture](docs/ARCHITECTURE.md) · [Go-to-market](docs/GO_TO_MARKET.md) · [SLM](slm/README.md) · [Model card](slm/MODEL_CARD.md) · [Implementation status](docs/IMPLEMENTATION_STATUS.md)

## Honest limits
- Live news sources are public endpoints; respect their usage policies at scale (GDELT asks for ≤ 1 request / 5 s — the default 10-minute cycle is well within).
- Re-route fares and durations are **estimates** with booking deep links, not live inventory. Seat holds are **sandbox** holds. Real ticketing needs GDS/IRCTC B2B accreditation.
- Compensation results are informational, not legal advice.
- Voice input uses the browser's Web Speech API (Chrome/Edge best); typing works everywhere.

MIT licensed.
