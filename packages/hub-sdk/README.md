# @gemiq/hub-sdk

The client every GEM.IQ assessment uses to talk to the Hub
(https://gemiq.globaledgemarkets.com).

## Install

There is no npm publish yet. **Copy `sdk.ts` into your IQ repo** as
`src/lib/hub.ts`, then create one client:

```ts
import { createHubClient } from "@/lib/hub";

export const hub = createHubClient({
  hubOrigin: "https://gemiq.globaledgemarkets.com",
});
```

The file has zero runtime dependencies — just `fetch` and the DOM.

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
