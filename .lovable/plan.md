# Unified GEM.IQ Integration Plan

Consolidate all IQ assessments (TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ, future) behind the Hub's identity, subscription, and HubSpot pipeline. Each IQ becomes a **thin front-end** that hands raw data to the Hub; the Hub is the single writer to Stripe and HubSpot.

---

## 1. The per-IQ integration contract (what every IQ must do)

Every IQ subdomain (`tariffiq.`, `readinessiq.`, `uxiq.`, `techservicesiq.`, ...) does exactly four things via `@gemiq/hub-sdk`:

1. **Auth** — no local login. Any "sign in" button calls `gemiq.auth.redirectToLogin({ returnTo })`. Session is read from the parent-domain cookie.
2. **Entitlement gate** — before starting the paid assessment, call `gemiq.subscription.check()`. If not active, call `gemiq.subscription.startCheckout(lookupKey, { successUrl: <resume>, cancelUrl: <current> })`.
3. **Submit** — on completion, call `gemiq.results.submit(payload)` with a rich, IQ-specific `detail` block (see §3). No direct HubSpot calls from the IQ.
4. **History (optional)** — `gemiq.results.history({ assessment })` to show the user their prior scores.

Everything else (Stripe session, contact upsert, property mapping, workflow trigger, retry) is Hub-owned.

---

## 2. Identity migration (one-time per IQ)

Since Hub becomes the sole auth going forward:

- **Cutover script** (Hub side, admin-only server fn): given a CSV/JSON export of each IQ's user table (email, name, company, created_at), invite each user via Supabase Admin `inviteUserByEmail` — creates a Hub `profiles` row and sends a password-set email. Idempotent by email.
- **Per-IQ codebase change**: replace the IQ's local auth screen with a redirect to `https://gemiq.globaledgemarkets.com/auth?return=<url>`. Delete local password/session code.
- **Historical results**: keep the IQ's old submission records read-only inside the IQ if desired, OR (recommended) do a one-time backfill into Hub `submissions` using each row's email so the Hub becomes the single source of truth.

---

## 3. Submit payload — flexible per-IQ detail

Extend the Hub's submit contract so each IQ can send its own richly-typed detail without changing the Hub schema every time:

```ts
type SubmitPayload = {
  assessment: string                 // 'tariffiq' | 'readinessiq' | 'uxiq' | 'techservicesiq' | ...
  contact:     { email, full_name?, company?, role?, phone? }
  score:       number                // 0..100 normalized
  tier:        'at_risk' | 'developing' | 'optimized'
  dimensions:  Array<{ name, score, tier }>   // <=8, shown on rollup
  detail:      Record<string, unknown>        // NEW: arbitrary IQ-specific payload
  segments?:   { industry?, company_size?, region?, ... }
  utm?:        { source?, medium?, campaign?, term?, content? }
  answers?:    Record<string, unknown>
  completed_at: string  // ISO
}
```

Stored on `submissions` as: normalized fields in columns; full `detail` and `answers` in existing `metadata`/`answers` jsonb.

---

## 4. HubSpot property registry (extensible per IQ)

The Hub gets a code-level **assessment registry** — one file per IQ that declares:

```ts
// src/lib/hub/assessments/tariffiq.ts
export const tariffiq: AssessmentSpec = {
  key: 'tariffiq',
  displayName: 'TariffIQ',
  // Properties this IQ contributes to the HubSpot contact
  contactProperties: [
    { name: 'gem_tariff_hs_code_readiness',   type: 'number' },
    { name: 'gem_tariff_supply_chain_score',  type: 'number' },
    { name: 'gem_tariff_trade_lanes',         type: 'multi_checkbox', options: [...] },
    // ...
  ],
  // Map a submission -> HubSpot property values
  toContactProperties: (sub) => ({
    gem_tariff_hs_code_readiness:  sub.detail.hsCodeReadiness,
    gem_tariff_supply_chain_score: sub.detail.supplyChain,
    gem_tariff_trade_lanes:        sub.detail.tradeLanes.join(';'),
    // + shared gem_assessment_tool / gem_assessment_score / gem_score_tier / gem_assessment_date (workflow triggers)
  }),
}
```

Each IQ file is registered in `src/lib/hub/assessments/index.ts`. Adding a new IQ = create one file + register it. Bootstrap script (idempotent, out of band) creates any missing HubSpot properties by walking the registry.

**Rollup properties** (`gem_customer`, `gem_last_assessment`, `gem_last_score`, `gem_last_tier`, `gem_last_completed_at`, `gem_assessments_completed_count`, `gem_assessments_taken`, `gem_highest_score`, `gem_lowest_score`) are computed by the Hub on every submit by re-reading that email's `submissions` history — one PATCH combines rollup + per-IQ latest fields.

**Workflow trigger** stays as agreed: refresh `gem_assessment_tool` + `gem_assessment_date` on every submit, no custom events.

---

## 5. Checkout redirect flow

```text
IQ (tariffiq.globaledgemarkets.com/paywall)
  └── gemiq.subscription.startCheckout('gemiq_professional_monthly',
        { successUrl: 'https://tariffiq.globaledgemarkets.com/resume?sid={CHECKOUT_SESSION_ID}',
          cancelUrl:  'https://tariffiq.globaledgemarkets.com/paywall' })
       └── POST hub /api/public/billing/create-checkout
              → returns Stripe URL
Browser → Stripe Checkout → success_url
IQ /resume page:
  └── gemiq.subscription.check() (blocks until active=true; webhook may lag ~1s)
  └── on active: continue the assessment
```

Only Hub's Stripe account is used. Existing webhook and `subscriptions` sync are unchanged.

---

## 6. Hub-side work items

1. **SDK**: add `auth.redirectToLogin`, `subscription.startCheckout` with returnUrls, `subscription.check` polling helper, expanded `results.submit` signature accepting `detail`.
2. **`/auth`**: honor `?return=<url>` and bounce back after sign-in (validated against `*.globaledgemarkets.com`).
3. **Assessment registry**: `src/lib/hub/assessments/{tariffiq,readinessiq,uxiq,techservicesiq}.ts` + index. TariffIQ + ReadinessIQ + UXIQ + TechServicesIQ specs stubbed from what we know; will need real property lists from you per IQ.
4. **HubSpot writer refactor**: replace fixed property list with `buildContactProperties(email, allSubmissionsForEmail)` that merges rollup + latest-per-IQ from the registry.
5. **Bootstrap-hubspot-schema** (already exists, extend): walk registry, `POST /crm/v3/properties/contacts` for any missing. Idempotent. Manual invocation only.
6. **Admin migration server fn**: `importLegacyUsers(csv)` → `inviteUserByEmail` loop, protected by `JOB_SECRET`.
7. **Optional**: `importLegacySubmissions(assessment, rows[])` server fn to backfill historical `submissions` rows by email.
8. **Docs**: `INTEGRATING.md` — the single page each IQ team follows to migrate.

---

## 7. Per-IQ work items (for each of TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ)

Coordinated per IQ, not in this project:

- Replace local auth UI with SDK redirect.
- Add paywall gate before starting the paid flow.
- Replace direct HubSpot submit with `gemiq.results.submit(...)`, mapping local answers into the standard payload + IQ-specific `detail`.
- Remove IQ's own Stripe integration (if any).
- Point domain cookies to `.globaledgemarkets.com` (SDK handles this once installed).

---

## 8. Open items I need from you before coding

- For each IQ (TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ): the list of HubSpot properties they currently write (name + type), so I can turn them into proper registry entries. If you don't have this, I can start with placeholder specs and iterate.
- Confirm we do the historical `submissions` backfill (recommended) vs leaving old data in each IQ's DB.
- Confirm the resume-URL contract you want (`?sid=` or a signed token) — default `?sid={CHECKOUT_SESSION_ID}` is simplest.

---

## Technical section

### Files this project will add/change
```text
src/lib/hub/
├── assessments/
│   ├── index.ts               # registry
│   ├── types.ts               # AssessmentSpec, PropertyDef
│   ├── tariffiq.ts
│   ├── readinessiq.ts
│   ├── uxiq.ts
│   └── techservicesiq.ts
├── hubspot.ts                 # refactor: registry-driven upsert
├── sdk.ts                     # expand SDK surface
└── migration.ts               # legacy import helpers

src/routes/api/public/admin/
├── bootstrap-hubspot-schema.ts    # extend to walk registry
├── import-legacy-users.ts         # NEW, JOB_SECRET-gated
└── import-legacy-submissions.ts   # NEW, JOB_SECRET-gated

src/routes/auth.tsx                # honor ?return=, validate origin

INTEGRATING.md                     # per-IQ team runbook
```

### Schema
No table changes required. `submissions.metadata jsonb` already stores arbitrary detail; `assessment_key` already free-form.

### Backward compatibility
The Hub's existing submit endpoint keeps accepting today's payload; `detail` is optional. Existing `check-subscription`, `create-checkout`, `create-portal-session`, webhook — all unchanged.

---

**Stopping for review.** Confirm the four decisions above, and share what you have on per-IQ HubSpot property lists (or say "start with placeholders and I'll fill in per IQ"), and I'll build.
