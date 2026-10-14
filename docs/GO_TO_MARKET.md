# Voyage — Go-to-market brief

## The problem we solve
Trips break because of the world — fog, strikes and bandhs, floods, quakes, curfews, airspace closures, outbreaks, visa changes. The signal is almost always in the news hours before it hits a booking, but nobody connects that news to *specific* travellers fast enough. Travellers find out at the gate; travel desks find out from angry phone calls; AI planners don't know what's happening today.

**Voyage watches the world for every trip and acts first.**

## Who buys (ICP) and why

| Segment | Pain | What they buy | Plan |
|---|---|---|---|
| **TMCs & corporate travel desks** (India-first: 50–5 000 travellers) | Duty-of-care obligations, manual crisis response, no single view of “who is where” | Duty-of-care console, mass check-ins, automations, audit trail | Team ₹4,999 / Business ₹19,999 per month |
| **OTAs & tour operators** | Disruption ops cost, refund/compensation load, demand shocks | Partner Risk API + MCP, signed webhooks into their booking engine, auto re-route suggestions, claims engine | Business / Enterprise |
| **Travel insurers & assistance cos.** | Need real-time exposure per policy-holder | Risk API, exposure webhooks, white-label check-ins | Enterprise |
| **Independent travellers** | Anxiety, wasted money when plans break | Voice co-pilot, live risk on every destination, auto re-routes and refund claims | Free → Pro ₹299/month |

## Differentiators
1. **Real-time & autonomous** — not a dashboard you have to watch; an agent that acts within policy (L0–L4) and shows its reasoning.
2. **Zero API keys / zero AI bills** — in-house SLM on CPU, keyless public data → gross margins stay high and data never leaves the customer's server (a strong enterprise/compliance story).
3. **India-native** — bandh/hartal/chakka-jam language, IRCTC & DGCA rules, Hindi/Hinglish voice, UPI billing, ₹ costs.
4. **Explainable** — every score has drivers; every action has a trace and an approval record.

## Packaging & pricing (see `/pricing`)
Explorer (free) · Pro Traveller ₹299/mo · Team ₹4,999/mo (50 travellers) · Business ₹19,999/mo (500 travellers, autopilot, API, webhooks) · Enterprise (self-hosted, white-label, custom SLM fine-tune).
Upsells: per-traveller overage, Risk API volume tiers, custom playbooks, on-prem deployment.

## 90-day launch plan
1. **Weeks 1–3 — design partners.** 5 Indian TMCs / corporate desks on the free Business pilot. Success metric: time-to-know “who is affected” < 2 min for a real incident.
2. **Weeks 4–8 — traveller funnel.** Risk Radar as an SEO/social magnet (“Is Goa safe right now?” pages), WhatsApp share of check-in links, Jarvis demo videos.
3. **Weeks 6–12 — API channel.** Risk API + webhook integration with 2 OTAs/tour operators; publish MCP tools for AI-agent platforms.

## Metrics to watch
Exposure detection lead time (news → alert), check-in response rate & median time, % actions auto-executed vs approved, claims recovered (₹), weekly active travel desks, API calls, net revenue retention.

## Risks & mitigations
- *Source availability / ToS* → many redundant keyless sources, configurable feeds, drill mode, polite polling.
- *False alarms* → impact & exposure thresholds, travel-relevance classifier (94.6 % blind), human approvals for anything above L3.
- *Liability* → advisories framed as information, compensation marked “not legal advice”, sandbox-only holds until supplier contracts exist.
