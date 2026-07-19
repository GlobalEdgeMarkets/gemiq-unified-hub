# Integrating an IQ assessment with GEM.IQ Hub

The Hub is the single source of identity, billing, and HubSpot writes. Every
IQ subdomain (tariffiq / readinessiq / uxiq / techservicesiq / future ones)
delegates all three to the Hub via `@gemiq/hub-sdk`.

## 1. Install the SDK (auto-pull from Hub)

The Hub repo owns the SDK. IQs pull it at build time so every IQ always
ships against the current contract — edit once in the Hub, all IQs pick it
up on their next build.

In the IQ project:

1. Copy [`packages/hub-sdk/pull-hub-sdk.mjs`](./packages/hub-sdk/pull-hub-sdk.mjs)
   into the IQ repo at `scripts/pull-hub-sdk.mjs`.
2. Add to the IQ's `package.json`:
   ```json
   {
     "scripts": {
       "pull:hub-sdk": "node scripts/pull-hub-sdk.mjs",
       "prebuild":     "node scripts/pull-hub-sdk.mjs"
     }
   }
   ```
3. Run once locally / in Lovable: `node scripts/pull-hub-sdk.mjs`. This
   writes `src/lib/hub.ts` (auto-generated, do not edit).
4. Create the client:
   ```ts
   import { createHubClient } from "@/lib/hub";
   export const hub = createHubClient({
     hubOrigin: "https://gemiq.globaledgemarkets.com",
   });
   ```

**Rule:** never edit `src/lib/hub.ts` inside an IQ project — it's overwritten
on every build. If an IQ needs an SDK change, propose it against this Hub
repo (PR or Lovable prompt). Once merged to `main`, every IQ picks it up on
its next publish.

## 2. Gate the assessment on session + subscription

At the start of the assessment (or on any page that must be behind the
paywall):

```ts
const status = await hub.subscription.check();
if (!status.authenticated) return hub.redirectToLogin(window.location.href);
if (!status.active) {
  await hub.subscription.startCheckout("gemiq_professional_monthly", {
    successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
    cancelUrl:  window.location.href,
  });
  return; // browser navigates to Stripe
}
```

Because the Hub sets its auth cookie on `.globaledgemarkets.com`, every IQ
subdomain sees the same session automatically — no token passing.

## 3. Resume page (`/resume`)

After Stripe redirects back to `?sid={CHECKOUT_SESSION_ID}`:

```ts
const status = await hub.subscription.waitUntilActive({ timeoutMs: 15000 });
if (status.active) router.replace("/start");
else showRetryButton();
```

`waitUntilActive` polls `check()` because the webhook may lag Stripe's
redirect by 1–3 seconds.

## 4. Submit results

At the end of the assessment:

```ts
await hub.results.submit({
  email: user.email,
  assessment_key: "tariffiq", // or readinessiq / uxiq / techservicesiq
  score, tier, dimensions,
  detail: {
    // Anything IQ-specific — recommendations, sub-scores, verbatims, etc.
    // Stored verbatim on the submission and mapped to gem_* HubSpot props
    // by the Hub's registry entry for this IQ.
  },
  metadata: { first_name, last_name, company },
});
```

The Hub handles: dedupe (10-minute window), DB insert, HubSpot upsert using
the full email history (rollups + latest-per-IQ), retry queue on failure.

## 5. Adding a new IQ

1. Create `src/lib/hub/assessments/<newiq>.ts` following the pattern in
   `tariffiq.ts`. Prefix every HubSpot property with `gem_<short>_`.
2. Add it to `REGISTRY` in `src/lib/hub/assessments/index.ts`.
3. POST `/api/public/admin/bootstrap-hubspot-schema` with `x-job-secret` to
   create the new properties in HubSpot. Idempotent.

That single registry entry drives: submission validation, HubSpot property
creation, HubSpot property mapping on every submit, and rollup counts.

## 6. Migrating an existing IQ

1. Turn off the IQ's direct HubSpot writes and its own payment/auth flows.
2. Point sign-in and checkout at the Hub via the SDK.
3. Invite existing IQ users into Hub Auth (bulk):
   `POST /api/public/admin/import-legacy-users` with `x-job-secret`.
4. Backfill historical submissions:
   `POST /api/public/admin/import-legacy-submissions` with `x-job-secret`.
   The endpoint rebuilds each contact's `gem_*` fields from the full history.
   Available but NOT invoked automatically.

## 7. Where to find things in this repo

Direct links (browse on GitHub):

- **SDK to consume from your IQ** — [`packages/hub-sdk/sdk.ts`](./packages/hub-sdk/sdk.ts) (auto-generated; source of truth: `src/lib/hub/sdk.ts`)
- **Puller script for IQs** — [`packages/hub-sdk/pull-hub-sdk.mjs`](./packages/hub-sdk/pull-hub-sdk.mjs)
- **Registry of all IQs** — [`src/lib/hub/assessments/index.ts`](./src/lib/hub/assessments/index.ts)
- **Per-IQ spec examples** — [`tariffiq.ts`](./src/lib/hub/assessments/tariffiq.ts), [`readinessiq.ts`](./src/lib/hub/assessments/readinessiq.ts), [`uxiq.ts`](./src/lib/hub/assessments/uxiq.ts), [`techservicesiq.ts`](./src/lib/hub/assessments/techservicesiq.ts)
- **Public HTTP endpoints IQs call** — [`src/routes/api/public/`](./src/routes/api/public/)
  - `billing/check-subscription.ts`, `billing/create-checkout.ts`, `billing/create-portal-session.ts`
  - `submissions/submit.ts`, `submissions/history.ts`
  - `auth/session.ts`
- **Admin (idempotent, `x-job-secret` gated)** — [`src/routes/api/public/admin/`](./src/routes/api/public/admin/)
  - `bootstrap-hubspot-schema.ts`, `import-legacy-users.ts`, `import-legacy-submissions.ts`
- **Repo overview** — [`README.md`](./README.md)
