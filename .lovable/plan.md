# GEM.IQ Hub — Implementation Plan

Central backend for all GEM.IQ assessments. Runs at `gemiq.globaledgemarkets.com`. Provides shared login, Stripe subscriptions, and a single submission pipeline to HubSpot (portal 46485313). This plan covers backend + SDK only — no assessment UIs.

Stack note: TanStack Start template. Per project conventions, app-internal server logic uses `createServerFn`; public webhooks and cross-subdomain endpoints called by external assessments use server routes under `src/routes/api/public/*`. "Edge functions" below map to server routes, not Supabase Edge Functions.

---

## a) Supabase schema (4 tables)

All tables in `public`. RLS enabled. Explicit GRANTs. `updated_at` triggers on all.

### 1. `profiles`
Mirrors `auth.users`, auto-created via trigger on signup.
- `id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`
- `email text NOT NULL`
- `full_name text`
- `company text`
- `hubspot_contact_id text` (populated on first successful submission)
- `stripe_customer_id text UNIQUE`
- `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- RLS: users select/update own row; service_role full.

### 2. `subscriptions`
System of record for entitlement, kept in sync by Stripe webhook.
- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `stripe_customer_id text NOT NULL`
- `stripe_subscription_id text UNIQUE NOT NULL`
- `stripe_price_id text NOT NULL`
- `lookup_key text NOT NULL` — `gemiq_professional_monthly` | `gemiq_professional_annual`
- `product text NOT NULL default 'gemiq_professional'`
- `status text NOT NULL` — Stripe status (`active`, `trialing`, `past_due`, `canceled`, ...)
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`
- `livemode boolean NOT NULL` — inferred from webhook event
- `created_at`, `updated_at`
- Index on `user_id`, `status`.
- RLS: user selects own; writes via service_role only.

### 3. `submissions`
One row per assessment completion. Supports retakes + progress.
- `id uuid PK default gen_random_uuid()`
- `user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL` (nullable — anonymous submissions allowed)
- `assessment text NOT NULL` — `tariffiq` | `readinessiq` | `uxiq` | `techservicesiq` | future
- `email text NOT NULL`
- `contact jsonb NOT NULL` — full name/company/role/phone
- `score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100)`
- `tier text NOT NULL CHECK (tier IN ('at_risk','developing','optimized'))`
- `dimensions jsonb NOT NULL` — array of `{name, score, tier}` (≤8)
- `segments jsonb` — e.g. industry, company size, region
- `utm jsonb`
- `answers jsonb` — raw responses (for retake diffing)
- `status text NOT NULL default 'completed'` — `in_progress` | `completed`
- `completed_at timestamptz NOT NULL`
- `hubspot_synced_at timestamptz`
- `hubspot_contact_id text`
- `created_at timestamptz default now()`
- Indexes: `(email, assessment, completed_at DESC)`, `(user_id, completed_at DESC)`, `(status)`.
- RLS: user selects own by `user_id` OR `email = auth.jwt()->>'email'`; inserts via service_role from submit route.

### 4. `retry_queue`
For HubSpot sync retries (429/5xx).
- `id uuid PK default gen_random_uuid()`
- `submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE`
- `operation text NOT NULL` — `upsert_contact` | `emit_event`
- `payload jsonb NOT NULL`
- `attempts int NOT NULL default 0`
- `max_attempts int NOT NULL default 8`
- `next_attempt_at timestamptz NOT NULL default now()`
- `last_error text`
- `last_status_code int`
- `state text NOT NULL default 'pending'` — `pending` | `succeeded` | `dead`
- `created_at`, `updated_at`
- Index on `(state, next_attempt_at)`.
- No user RLS access; service_role only.

**Backoff:** `next_attempt_at = now() + min(60s * 2^attempts, 6h)` plus jitter.

**Auth trigger:** `handle_new_user()` inserts into `profiles` on `auth.users` insert.

---

## b) Server endpoints (edge functions)

All under `src/routes/api/public/*` so external assessment subdomains can call them. Every endpoint validates its Supabase bearer (except webhook + checkout for anon-friendly flows) and returns JSON.

### `create-checkout` — POST `/api/public/billing/create-checkout`
- Input: `{ lookup_key: 'gemiq_professional_monthly' | 'gemiq_professional_annual', success_url, cancel_url }`
- Auth: requires Supabase user (bearer). Resolves/creates `stripe_customer_id` on profile.
- Resolves price via `stripe.prices.list({ lookup_keys: [lookup_key], active: true, expand: ['data.product'] })`.
- Creates `checkout.sessions.create({ mode: 'subscription', customer, line_items: [{ price, quantity: 1 }], allow_promotion_codes: true, success_url, cancel_url, subscription_data: { metadata: { user_id }}, client_reference_id: user_id })`.
- Output: `{ url }`

### `create-portal-session` — POST `/api/public/billing/create-portal-session`
- Input: `{ return_url }`
- Auth: user bearer required.
- Creates `billingPortal.sessions.create({ customer, return_url })`.
- Output: `{ url }`

### `check-subscription` — GET `/api/public/billing/check-subscription`
- Auth: user bearer required.
- Reads `subscriptions` row for user; if missing/stale, reconciles by calling Stripe `subscriptions.list({ customer })` and upserts.
- Output: `{ active: boolean, status, lookup_key, current_period_end, cancel_at_period_end, product }`

### `payments-webhook` — POST `/api/public/billing/webhook`
- Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET` (raw body).
- Handles: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_succeeded|failed`.
- Upserts `subscriptions` keyed on `stripe_subscription_id`. Records `livemode` from event.
- Returns 200 fast; retries handled by Stripe.

### `submit` — POST `/api/public/submissions/submit`
- Input: standard submit payload (see SDK section).
- Auth: optional user bearer. If present, sets `user_id`. Anonymous allowed.
- Steps:
  1. Zod-validate payload.
  2. Insert `submissions` row (`status='completed'`).
  3. Try HubSpot upsert synchronously (short timeout, e.g. 4s):
     - `GET /crm/v3/objects/contacts/{email}?idProperty=email` → if 404, `POST /crm/v3/objects/contacts` else `PATCH`.
     - Payload = unified `gem_*` property set (see HubSpot section).
     - On success, `POST /events/v3/send` with `eventName='pe{portalId}_gem_assessment_completed'` (custom behavioral event) with `email` + rich properties.
     - Update `submissions.hubspot_contact_id`, `hubspot_synced_at`; write `profiles.hubspot_contact_id`.
  4. On 429/5xx/network: enqueue `retry_queue` entries and return 202 with `{ queued: true }`.
- Output: `{ submission_id, hubspot: { synced: boolean, contact_id?: string, queued?: boolean } }`

### `retry-worker` — POST `/api/public/jobs/retry-hubspot`
- Called by `pg_cron` every minute via `pg_net` hitting the stable `project--{id}.lovable.app` URL. Header `X-Job-Secret` matched against `JOB_SECRET`.
- Pulls up to N pending retries where `next_attempt_at <= now()`; re-runs the operation; updates state.
- After `max_attempts` → `state='dead'` + log for manual review.

---

## c) SDK contract — `@gemiq/hub-sdk`

Small browser+node package each assessment imports. Reads config from `import.meta.env.VITE_GEMIQ_*`.

```ts
gemiq.init({ hubUrl, supabaseUrl, supabasePublishableKey })

// Auth (Supabase client scoped to .globaledgemarkets.com cookie)
gemiq.auth.getSession(): Promise<Session | null>
gemiq.auth.onAuthStateChange(cb): Unsubscribe
gemiq.auth.signIn({ email, password }): Promise<Session>
gemiq.auth.signInWithOAuth('google'): Promise<void>
gemiq.auth.signUp({ email, password, fullName?, company? }): Promise<Session>
gemiq.auth.signOut(): Promise<void>

// Subscription
gemiq.subscription.check(): Promise<{ active, status, lookup_key, current_period_end }>
gemiq.subscription.startCheckout(lookupKey: 'gemiq_professional_monthly' | 'gemiq_professional_annual', opts?: { successUrl, cancelUrl }): Promise<void>  // redirects
gemiq.subscription.openPortal(returnUrl?): Promise<void>  // redirects

// Results
gemiq.results.submit(payload: SubmitPayload): Promise<SubmitResult>
gemiq.results.history({ assessment? }): Promise<Submission[]>  // reads user's own submissions
```

### Standard submit payload
```ts
type SubmitPayload = {
  assessment: 'tariffiq' | 'readinessiq' | 'uxiq' | 'techservicesiq' | string
  contact: { email: string; full_name?: string; company?: string; role?: string; phone?: string }
  score: number            // 0..100
  tier: 'at_risk' | 'developing' | 'optimized'
  dimensions: Array<{ name: string; score: number; tier: SubmitPayload['tier'] }>  // ≤8
  segments?: { industry?: string; company_size?: string; region?: string; [k: string]: unknown }
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }
  answers?: Record<string, unknown>
  completed_at: string  // ISO
}
```

---

## d) Stripe test→live switch via lookup_keys

**Design:** never reference `price_...` IDs in code. Only `lookup_key` strings.

- Test mode setup (Stripe dashboard, test env):
  - Product: `GEM.IQ Professional`
  - Price A: $99 USD/month recurring, `lookup_key = gemiq_professional_monthly`
  - Price B: $990 USD/year recurring, `lookup_key = gemiq_professional_annual`
- Live mode: recreate the same product + two prices with the **same lookup_keys**.
- Runtime: `stripe.prices.list({ lookup_keys, active: true })` returns the correct env's price. Cache in memory per instance (5 min TTL) to avoid a lookup per checkout.
- Env inference: `const isLive = process.env.STRIPE_SECRET_KEY!.startsWith('sk_live_')` — surfaced in logs and stored on `subscriptions.livemode` from webhook events (`event.livemode`).
- **Switch procedure**: (1) rotate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` secrets, (2) redeploy. No code change. Existing test subscriptions remain in DB with `livemode=false`; live ones write `livemode=true`.

**Secrets required:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

---

## e) HubSpot properties (portal 46485313)

Create three property groups on the **Contact** object. All internal names prefixed `gem_`. Types shown.

### Group 1: `gem_rollup` — cross-IQ rollup (single set)
- `gem_customer` (bool) — has ever submitted any IQ
- `gem_last_assessment` (single-line) — most recent assessment key
- `gem_last_score` (number)
- `gem_last_tier` (dropdown: at_risk, developing, optimized)
- `gem_last_completed_at` (datetime)
- `gem_assessments_completed_count` (number)
- `gem_assessments_taken` (multi-checkbox) — set of assessment keys
- `gem_highest_score` (number)
- `gem_lowest_score` (number)

### Group 2: per-assessment latest (one group per IQ; example `gem_tariffiq`)
For each of `tariffiq`, `readinessiq`, `uxiq`, `techservicesiq`:
- `gem_{iq}_score` (number)
- `gem_{iq}_tier` (dropdown)
- `gem_{iq}_completed_at` (datetime)
- `gem_{iq}_retake_count` (number)
- `gem_{iq}_dimensions_json` (multi-line text) — JSON string of dimensions array
- `gem_{iq}_top_strength` (single-line) — highest dimension name
- `gem_{iq}_top_gap` (single-line) — lowest dimension name

### Group 3: `gem_subscription`
- `gem_subscription_status` (dropdown: none, active, trialing, past_due, canceled)
- `gem_subscription_plan` (dropdown: gemiq_professional_monthly, gemiq_professional_annual)
- `gem_subscription_current_period_end` (datetime)
- `gem_stripe_customer_id` (single-line)

**Custom behavioral event:** `gem_assessment_completed` with properties: `assessment`, `score`, `tier`, `dimensions_json`, `utm_source`, `utm_campaign`, `submission_id`.

**Submit-time write:** compute rollup + per-assessment fields server-side from `submissions` history for that email, then PATCH the contact with the merged property set (single API call).

**Secrets required:** `HUBSPOT_PRIVATE_APP_TOKEN` with scopes `crm.objects.contacts.read/write`, `crm.schemas.contacts.read/write`, `behavioral_events.event_definitions.read_write`.

---

## f) Cross-subdomain auth

Goal: one login at `gemiq.globaledgemarkets.com` valid on `tariffiq.globaledgemarkets.com`, etc.

- Use Supabase Auth with **cookie-based session storage** (not localStorage), cookie attributes: `Domain=.globaledgemarkets.com; Path=/; Secure; SameSite=Lax; HttpOnly` for the refresh token, and a readable access-token cookie (or JWT in a JS-readable cookie) also scoped to the parent domain.
- Implementation: initialize `@supabase/ssr`'s `createBrowserClient` in the SDK with a custom cookie adapter that sets `domain: '.globaledgemarkets.com'` when hostname endsWith it (dev fallback: default localhost behavior).
- Supabase Auth settings: add every subdomain to **Site URL / Additional Redirect URLs** (`https://gemiq.globaledgemarkets.com`, `https://tariffiq...`, `https://readinessiq...`, etc.).
- Sign-in flow: all sign-in/sign-up happens on `gemiq.globaledgemarkets.com/auth` (single canonical page). Assessment subdomains that need auth redirect to it with `?redirect=<origin>/return`. On success, the browser has the parent-domain cookie and every subdomain sees the session immediately.
- OAuth (Google): redirect URI is the hub domain only; hub then bounces back to the assessment's return URL.
- SDK auth methods proxy to the browser Supabase client; server-side calls (submit, billing) send the access token via `Authorization: Bearer`.
- CSRF: state-changing hub endpoints require the bearer (double-submit not needed since we don't rely on ambient cookies for API auth — cookies are only for cross-subdomain session propagation to the JS client).

**Sign-out:** hub route clears the parent-domain cookies; SDK broadcasts a `BroadcastChannel('gemiq_auth')` message so open assessment tabs re-check session.

---

## Secrets to add (Project Settings → Secrets)
- `STRIPE_SECRET_KEY` (test: `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` (test)
- `HUBSPOT_PRIVATE_APP_TOKEN`
- `HUBSPOT_PORTAL_ID` = `46485313`
- `JOB_SECRET` (generated, for retry cron auth)

Supabase (Lovable Cloud) will provision its own env.

---

## Build order (once approved)
1. Enable Lovable Cloud → run migrations for the 4 tables, trigger, RLS, GRANTs.
2. Add secrets.
3. Implement Stripe routes + webhook + `subscriptions` sync.
4. Implement HubSpot property bootstrap script (idempotent — creates missing properties/event via API on first run).
5. Implement `submit` route + retry queue + `pg_cron` worker.
6. Implement cross-subdomain cookie auth in Supabase client + `/auth` page on hub.
7. Publish SDK (`@gemiq/hub-sdk`) — versioned, TypeScript.
8. Smoke-test end-to-end with a stub assessment.

---

**Stopping here for review.** No application code will be written until you approve or amend this plan. Please confirm:
- 4-table schema shape (especially anonymous submissions allowed)
- Endpoint list + paths under `/api/public/*`
- HubSpot property names/groups exactly as listed
- Cross-subdomain cookie approach (parent-domain cookie via `@supabase/ssr`)
- SDK surface + payload shape