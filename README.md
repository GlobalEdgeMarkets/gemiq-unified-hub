# GEM.IQ Hub

The central identity, billing, and HubSpot-write service for every GEM.IQ
assessment (TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ, and future IQs).

Live: https://gemiq.globaledgemarkets.com

## What lives here

Every IQ subdomain delegates three things to this Hub:

1. **Identity** — Supabase Auth with a cookie scoped to
   `.globaledgemarkets.com`, so a single sign-in works across every IQ.
2. **Billing** — Stripe checkout, customer portal, and subscription state.
   IQs check `subscription.check()` before starting an assessment.
3. **HubSpot writes** — every submission from every IQ flows through the Hub,
   which upserts the contact and refreshes `gem_*` properties + workflow
   triggers. IQs never call HubSpot directly.

## Repo map — contract vs. internal

If you're integrating a new (or existing) IQ, only the **contract** files
matter. Everything else is Hub-internal and can change without notice.

### Contract (safe to copy / depend on)

| File | Purpose |
| --- | --- |
| [`packages/hub-sdk/sdk.ts`](./packages/hub-sdk/sdk.ts) | The `@gemiq/hub-sdk` client. Copy this file into each IQ as `src/lib/hub.ts`. |
| [`INTEGRATING.md`](./INTEGRATING.md) | Step-by-step playbook: gating, checkout, resume page, submit, adding a new IQ, migrating an existing IQ. |
| [`src/lib/hub/assessments/types.ts`](./src/lib/hub/assessments/types.ts) | Types every IQ registry entry conforms to (read-only reference — the file lives in the Hub). |
| Public HTTP endpoints under `src/routes/api/public/**` | The stable API surface IQs call. Documented in `INTEGRATING.md`. |

### Hub-internal (do NOT copy into IQ repos)

- `src/lib/hub/assessments/*.ts` — the assessment registry. Each IQ's spec
  (e.g. `tariffiq.ts`) lives here and here only. To add or change a mapping,
  edit it in this repo.
- `src/lib/hub/hubspot.ts`, `stripe.ts`, `supabase-server.ts`, `cookies.ts` —
  server-only integration code.
- `src/routes/api/public/**` handlers — IQs call these URLs; they don't
  reimplement them.
- `src/routes/**` pages — the Hub's own landing and auth UI.

## Adding a new IQ

1. Read [`INTEGRATING.md`](./INTEGRATING.md).
2. In the Hub repo (this repo): add `src/lib/hub/assessments/<newiq>.ts` and
   register it in `src/lib/hub/assessments/index.ts`.
3. In the IQ repo: copy `packages/hub-sdk/sdk.ts` in as `src/lib/hub.ts` and
   wire the SDK per the playbook.
4. POST `/api/public/admin/bootstrap-hubspot-schema` (with `x-job-secret`) to
   create the new HubSpot properties. Idempotent.

## Migrating an existing IQ

See [`INTEGRATING.md` §6](./INTEGRATING.md#6-migrating-an-existing-iq).

## Development

This is a TanStack Start app deployed on Cloudflare Workers via Lovable.
Backend is Supabase (auth + Postgres). AI/email/other integrations are wired
through Lovable connectors — see project settings.
