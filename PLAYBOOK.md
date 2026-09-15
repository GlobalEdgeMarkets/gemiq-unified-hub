# GEM.IQ Playbook — v1.5

**Status:** current as of 2026-09-15. Supersedes v1.4 (6 undifferentiated
"capability" IQs, manifest v1.4.0). If a doc, prompt, or GitHub knowledge file
disagrees with this file, this file wins.

## What changed since v1.3

| Area | v1.3 | v1.5 (now) |
| --- | --- | --- |
| Product set | 8 *industry* IQs | 6 IQs in **two tracks**: 5 capability + 1 specialist |
| Dimensions | 5 per assessment | 8–9 per assessment |
| Maturity model | Ad-hoc per IQ | One canonical 5-tier scale |
| Identity / billing / CRM | Per-IQ, duplicated | Centralized in GEM.IQ Hub |
| Pricing | Subscription only | $179 single assessment **or** suite subscription |
| ReadinessIQ | Flagship market-entry IQ | Retired → replaced by GTMIQ, legacy links 301 to Hub `/dashboard` |
| TechServicesIQ | Live | Not marketed; registry entry retained only |

---

## 1. The suite — two tracks, one site

As of 2026-09-15 the six IQs are split into **two tracks**. Both are covered by the
suite plan; the split is about relevance, not entitlement.

**Capability diagnostics (5)** — GTMIQ, SalesIQ, ProductIQ, AITransformIQ, UXIQ.
They answer *"is this capability mature?"*, score 8–9 dimensions each, and land on
the canonical five-tier maturity scale. Every company has these functions, so every
company can run them and compare across disciplines.

**Specialist diagnostics (1)** — TariffIQ. A narrow domain question with a dollar
output (recoverable duty), relevant only to companies carrying that exposure —
importers, offshore manufacturers, duty payers. Same rigour and same tier scale, but
it does not apply universally, and the home page says so.

**The suite plan covers both tracks.** A subscriber gets all six IQs, capability and
specialist alike, plus the composite report.

Display order is centrally defined by the **exported** `DISPLAY_ORDER` in
`src/lib/iq-catalog.ts` — the single source for ordering — and must be identical on
every surface (home grid, sample-report tabs, onboarding list, sitemap, llms.txt).

| # | IQ | `assessment_key` | Track | Subdomain | Dimensions | What it answers |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GTMIQ | `gtmiq` | capability | gtmiq.globaledgemarkets.com | 9 | Can we enter or expand in this market, and in what order? |
| 2 | SalesIQ | `salesiq` | capability | salesiq.globaledgemarkets.com | 9 | Is the commercial engine ready to carry the number? |
| 3 | ProductIQ | `productiq` | capability | productiq.globaledgemarkets.com | 9 | Is the product packaged, documented, and scalable enough to sell repeatedly? |
| 4 | AITransformIQ | `aitransformiq` | capability | aitransformiq.globaledgemarkets.com | 9 | Are strategy, data, talent, and governance ready for AI to matter? |
| 5 | UXIQ | `uxiq` | capability | uxreadiness.globaledgemarkets.com | 8 | Does the experience convert, retain, and include? |
| 6 | TariffIQ | `tariffiq` | specialist | tariffiq.globaledgemarkets.com | 8 | What is duty actually costing us and what is recoverable? |

Note: UXIQ's `assessment_key` is `uxiq` but its host is **uxreadiness**. The catalog,
the manifest, and the `/auth` context map all key off `uxreadiness`.

Retired / non-marketed keys are one exported set — `RETIRED_KEYS` in
`src/lib/hub/assessments/index.ts` (`readinessiq`, 33 migrated legacy submissions;
`techservicesiq`) — with `LIVE_REGISTRY` derived from it. Their specs stay in
`REGISTRY` so historical submissions keep mapping to HubSpot.

**Rule:** retiring an IQ means adding its key to `RETIRED_KEYS`, nothing else. Never
hand-filter a retired key at a call site; consume `LIVE_REGISTRY` instead.

**Rule:** an IQ is "in the suite" only when it (a) has a registry spec in
`src/lib/hub/assessments/`, (b) appears in `src/lib/iq-catalog.ts`, and (c) submits
through the Hub SDK. Anything else is a prototype.

## 2. The dimension standard — 8 or 9, never 5

Each IQ scores **8–9 independent dimensions**, 0–100 each. Dimensions are scored
independently (no forced curve, no single roll-up index), then combined into a
composite. Weights are expert-derived and published in the report.

- GTMIQ / SalesIQ / ProductIQ / AITransformIQ: 9 dimensions
- UXIQ / TariffIQ: 8 dimensions

Dimension names are owned by `src/lib/iq-catalog.ts` (marketing copy) and the
per-IQ registry spec (HubSpot mapping). They must match. Each dimension is stored
as its own HubSpot property (`gem_<short>_<dimension>`) — never as a JSON blob.

Positioning language: a single-number index is a **thermometer**; GEM.IQ is an
**X-ray**. Dimension-level output is the product, not a nice-to-have.

## 3. The canonical 5-tier maturity model

One scale across all IQs (`src/lib/hub/assessments/tiers.ts`,
`CANONICAL_TIER_OPTIONS`):

| Tier | Value | Band (composite) | Meaning |
| --- | --- | --- | --- |
| Reactive | `reactive` | < 30 | Ad hoc, person-dependent, no repeatable process |
| Developing | `developing` | 30–49 | Practices exist but are inconsistent and untracked |
| Defined | `defined` | 50–69 | Documented, repeatable, owned |
| Advanced | `advanced` | 70–84 | Measured, benchmarked, improving |
| Optimized | `optimized` | 85+ | Continuously optimized and predictive |

Rules:

1. Tier values are **lowercase** on the wire and in HubSpot enums.
2. IQs with local tier vocabulary (e.g. "at risk", "ready", "expert") map to the
   canonical five **locally**, before submitting. The Hub also normalizes known
   aliases as a safety net.
3. Bands are **provisional** and hardened as benchmark volume grows — say so in the
   report; do not present them as validated norms.
4. Never add a sixth tier or rename one in a single IQ.

## 4. Hub contract (unchanged surface, restated)

Every IQ delegates three things:

1. **Identity** — Supabase Auth, cookie scoped to `.globaledgemarkets.com`. One
   sign-in works across all subdomains.
2. **Billing** — Stripe checkout + portal through the Hub. IQs call
   `hub.subscription.check()` before starting, and `hub.results.submitOrUpgrade()`
   at the end so trial/credit limits route to checkout instead of failing.
3. **CRM** — the Hub is the only writer to HubSpot. IQs must not POST HubSpot
   forms or call the CRM API.

Five onboarding steps, identical for every IQ (only `ASSESSMENT_KEY` changes):
pull the SDK → create the client → gate on session + subscription → add `/resume`
polling → submit via `submitOrUpgrade` with `metadata.report_url`.

Automatic central sync: the SDK polls the Hub manifest every 5 minutes (and on tab
focus) and applies brand tokens/logos. `/onboard` exposes a **Sync now** button and
a live next-sync countdown.

## 5. Pricing (v1.5)

Two choices only — never present a third path:

- **Single assessment — $179 one-time** (`gemiq_single_assessment`): one credit,
  full dashboard access, upgradeable.
- **Full suite — GEM.IQ Professional**: $99/mo (`gemiq_professional_monthly`),
  **$279/quarter (default)** (`gemiq_professional_quarterly`), $990/yr
  (`gemiq_professional_annual`).

7-day trial includes **one** assessment across any discipline. 14-day money-back
guarantee. Monthly is cancel-anytime — quarterly is the commitment play; there is
no 2-month minimum.

## 6. Data integrity invariants

- **Email is the identity key** for HubSpot dedup. Six IQs write to one contact;
  `assessments_completed` and per-IQ `gem_*` fields coexist and must never
  overwrite each other. Verified 2026-07-29 (5 IQs side-by-side on one contact).
- Attribution/source fields are written **only on contact creation**.
- Failed CRM writes land in `retry_queue`; queue depth should be 0 at steady state.
- Lead creation: Warm by default, **Hot at composite ≥ 80**.
- Composite report = mean of completed IQ composites, with strengths/gaps rolled up
  across assessments.

## 7. Open items carried into v1.5

- `readinessiq.globaledgemarkets.com` is cut over: DNS repointed to the Hub and the
  legacy project unpublished; legacy paths now return permanent 301s to `/dashboard`.
- "AI Transformation Compass" (`future-readiness-check`) is redundant with
  AITransformIQ — cleanup candidate, 0 submissions.
- AITransformIQ project metadata has been corrected to AI transformation readiness
  (previously described as a PDF retriever). Closed.
- Stack split is deliberate: Hub + 4 new IQs on TanStack Start; TariffIQ and UXIQ
  remain stable legacy on Vite/React.
- The Hub manifest is a **single file** — `src/lib/hub/manifest.json`, now **v1.5.0**
  — served at `/api/public/manifest`. It carries `track` on every assessment plus a
  top-level `tracks` object. There is no manifest mirror. Only the SDK is mirrored:
  `src/lib/hub/sdk.ts` → `packages/hub-sdk/sdk.ts` via `scripts/mirror-sdk.mjs`.
  Never hand-edit the package copy. Closed.

### Decisions

- **VentureIQ — PARKED (2026-09-15).** Proposed as a merge of M&AReadinessIQ and
  FundraiseIQ into a single "is the company investable, and at what discount?"
  diagnostic (~9 dimensions, raising-vs-selling intake branch). Considered and
  deliberately parked; **nothing was built** — no catalog entry, no registry spec,
  no landing page. Do not build it, and do not re-propose it as a new idea: it
  requires a fresh explicit decision from the owner first.

## 8. Related docs

- [`INTEGRATING.md`](./INTEGRATING.md) — step-by-step IQ integration
- [`IQ_ONBOARDING_PROMPT.md`](./IQ_ONBOARDING_PROMPT.md) — paste-into-IQ prompt
- [`README.md`](./README.md) — repo map, contract vs. internal
- `/onboard` and `/docs` on the live Hub — always current
