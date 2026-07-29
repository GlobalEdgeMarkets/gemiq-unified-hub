# Onboarding an IQ — no terminal required

Every IQ is a Lovable project with GitHub connected, so nothing here needs a
local shell or CI setup by hand. There are two propagation paths, and only the
first is required.

---

## Path A (required, zero build steps) — runtime manifest

Brand tokens, pricing, deep links and the assessment registry are served live
by the Hub at:

```
GET https://gemiq.globaledgemarkets.com/api/public/manifest
```

An IQ that reads this at boot picks up branding/pricing changes within minutes
— no rebuild, no CI, no GitHub polling. This is the propagation mechanism that
actually matters day to day.

## Path B (optional) — build-time SDK pull

`scripts/pull-hub-sdk.mjs` + `prebuild` keeps `src/lib/hub.ts` byte-identical
to the Hub's SDK, and `check-hub-sdk.yml` fails a PR that drifts. Useful when
the **contract** (function signatures) changes, not just values. Skip it if an
IQ prefers to paste the SDK once and update on request.

---

## How to run onboarding inside a Lovable IQ project

Open the IQ project's chat and paste the prompt below, replacing
`<ASSESSMENT_KEY>` with the registered key (`gtmiq`, `salesiq`, `productiq`,
`aitransformiq`, `uxiq`, `tariffiq`).

The agent in that project has a sandbox shell, so it can run the init script
itself — you don't need one.

````text
Wire this project into GEM.IQ Hub. Do exactly these steps and nothing else.

1. Run in the sandbox:
   curl -sSL https://raw.githubusercontent.com/GlobalEdgeMarkets/gemiq-unified-hub/main/scripts/hub-init.mjs -o /tmp/hub-init.mjs && node /tmp/hub-init.mjs --key <ASSESSMENT_KEY>

   That writes scripts/pull-hub-sdk.mjs, src/lib/hub.ts,
   src/lib/hub-manifest.json, src/lib/hub-client.ts, HUB_INTEGRATION.md and
   adds the pull:hub-sdk + prebuild scripts to package.json.
   Never hand-edit src/lib/hub.ts — it is regenerated on every build.

2. Add .github/workflows/check-hub-sdk.yml mirroring the Hub's job: on push and
   pull_request touching src/lib/hub.ts or scripts/pull-hub-sdk.mjs, run
   `node scripts/pull-hub-sdk.mjs` and fail if it produces a diff.

3. Live sync is automatic — createHubClient() polls the Hub manifest every
   5 min (and on tab focus) and applies brand tokens itself. Just render logos
   as <img data-gem-logo="standard" alt="GEM" /> and drive colors, fonts, price
   labels and IQ deep links from the manifest — never hardcode them.


4. Gate the assessment:
   const status = await hub.subscription.check();
   if (!status.authenticated) return hub.redirectToLogin(window.location.href);
   if (!status.active) return hub.subscription.startCheckout("gemiq_professional_monthly", {
     successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
     cancelUrl:  window.location.href,
   });

5. Add a /resume page that calls
   hub.subscription.waitUntilActive({ timeoutMs: 15000 }) and routes to the
   assessment when active.

6. Submit final results with:
   await hub.results.submitOrUpgrade({
     email, assessment_key: "<ASSESSMENT_KEY>", score, tier, dimensions,
     detail: { /* IQ-specific */ },
     metadata: { first_name, last_name, company, report_url },
   });

Never call HubSpot, Stripe or Supabase Auth directly — the Hub is the only
writer. Tiers must be one of: reactive, developing, defined, advanced,
optimized.
````

---

## Verify an IQ is wired correctly

- `src/lib/hub.ts` exists and starts with the AUTO-PULLED banner.
- `src/lib/hub-manifest.json` version matches
  `https://gemiq.globaledgemarkets.com/api/public/manifest`.
- Signing in on the Hub leaves the IQ signed in (shared
  `.globaledgemarkets.com` cookie).
- A test submission appears on the Hub `/dashboard` and in HubSpot.

Full contract reference: [`INTEGRATING.md`](./INTEGRATING.md) and
`https://gemiq.globaledgemarkets.com/docs`.
