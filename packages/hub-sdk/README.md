# @gemiq/hub-sdk

The client every GEM.IQ assessment uses to talk to the Hub
(https://gemiq.globaledgemarkets.com).

## Install (auto-pull, recommended)

No npm publish. Each IQ project pulls this file from GitHub at build time
so it always ships against the current Hub contract.

1. Copy [`pull-hub-sdk.mjs`](./pull-hub-sdk.mjs) into the IQ repo at
   `scripts/pull-hub-sdk.mjs`.
2. Add to the IQ's `package.json`:
   ```json
   { "scripts": { "prebuild": "node scripts/pull-hub-sdk.mjs" } }
   ```
3. Run once: `node scripts/pull-hub-sdk.mjs`. It writes
   `src/lib/hub.ts` (auto-generated — do not edit).
4. Use it:
   ```ts
   import { createHubClient } from "@/lib/hub";
   export const hub = createHubClient({
     hubOrigin: "https://gemiq.globaledgemarkets.com",
   });
   ```

Zero runtime dependencies — just `fetch` and the DOM.

## Editing the SDK

Only edit `src/lib/hub/sdk.ts` in the **Hub** repo. The Hub's own build
copies it to `packages/hub-sdk/sdk.ts`, and every IQ picks it up on its
next publish via the puller.

## What it covers

- `hub.subscription.check()` — is the user signed in? do they have an active
  sub?
- `hub.subscription.startCheckout(lookup_key, { successUrl, cancelUrl })` —
  redirects to Stripe.
- `hub.subscription.waitUntilActive()` — poll on your `/resume` page after
  Stripe returns.
- `hub.subscription.openPortal(returnUrl)` — Stripe customer portal.
- `hub.results.submit({...})` — final submission; Hub handles dedupe + HubSpot.
- `hub.redirectToLogin(returnTo)` — bounce anonymous users to Hub auth.

Full flow with examples lives in
[`../../INTEGRATING.md`](../../INTEGRATING.md).

## Versioning

The SDK's contract is the HTTP surface at `gemiq.globaledgemarkets.com` — it
is stable and additive. When it changes in a way that requires IQ updates,
we'll bump a `SDK_VERSION` constant in `sdk.ts` and note it in
`INTEGRATING.md`.
