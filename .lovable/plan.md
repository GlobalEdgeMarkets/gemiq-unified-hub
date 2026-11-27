# Hub fixes from Alex's ProductIQ test (corpcross@gmail.com)

Five separate pieces of work. Each can be approved and built on its own. Nothing has been changed yet.

## What I found (checked in the code today)

- The manifest publishes `deep_links.portal = /account`. The Hub has no `/account` page, so that link gives a 404.
- The Hub already has a Stripe "manage billing" action, but it's a button action, not a page you can link to.
- The trial links the manifest publishes use `plan=monthly`, `plan=quarterly` and `plan=annual`. The sign-in page only knows `growth`, `complete` and `complete_annual`. So those plan names can't pick a price.
- For a signed-in person who is already on a trial, a `trial=1` link is treated as "asking for a second trial", so it sends them to the dashboard.
- Sign-in and sign-up both carry the return address in `?redirect=`. But when a return address is there, the sign-in page skips checkout entirely ("the IQ handles its own checkout").
- Sign-up sends no return address in the confirmation email, so confirming lands on the Hub's default page. And after "check your email", the return address is dropped from the screen.
- The return-address check currently accepts any `*.globaledgemarkets.com` address and any `*.lovable.app` address. That's wider than "registered IQ sites only".
- The profile feed (`/api/public/profile`) already returns first name, last name, full name, email, company, title, role and industry. IQs can update it too. Sign-up only collects first name, last name and company.
- The dashboard "Start <IQ>" buttons use each IQ's `url` from the manifest. That's the IQ's home page. The app registry (`hub_iq_apps`) has a `site_url` but no "start assessment" address.

## 1. "Open Hub dashboard" 404 — do first

- **Answer:** "portal" was meant as the person's Hub home (dashboard), not Stripe. The sign-in page and docs treat it as a Hub page, and the Stripe portal can't be linked to directly because it needs a session created on the spot.
- **Fix:**
  - Add an `/account` page that forwards to `/dashboard`, keeping any `?query`.
  - The manifest then publishes `portal` and a new `dashboard` link, both pointing to `/dashboard`.
  - Add `manage_billing` pointing to `/dashboard?billing=1`. The dashboard opens the Stripe portal when it sees that.
- **Files:**
  - new `src/routes/account.tsx`
  - `src/lib/hub/manifest.json`
  - `src/lib/hub/sdk.ts` plus a re-run of the SDK copy script
  - `public/llms.txt`
  - `src/routes/docs.tsx`
  - `PLAYBOOK.md`
  - `src/routes/dashboard.tsx` (only for `billing=1`)
  - test file
- **Manifest:** goes to 1.13.0 (new links added; nothing removed).
- **Republish IQs?** No. The forwarding works for old copies of the manifest too.
- **How to test:** open `/account` signed out (you land on sign-in, then the dashboard) and signed in as a trial user (you land on the dashboard). Plus a test that `/account?x=1` keeps its query.

## 3. After registering, return to the IQ — second

- **Where it gets lost:**
  - (a) The email confirmation link has no return address.
  - (b) The "check your email, then sign in" step clears the return address from the screen.
  - (c) The return-address check is too wide.
  - (d) If the IQ's link has no `redirect=`, there's nothing to return to. I'll confirm ProductIQ's link in step 1 of the build, without changing ProductIQ.
- **Fix:**
  - One shared check that only allows https addresses whose host is a `site_url` in the app registry (plus the Hub itself).
  - Sign-up passes a confirmation address of `https://gemiq…/auth?redirect=<checked address>`, so confirming continues the journey.
  - Keep `redirect=` in place when switching to sign-in.
- **Files:**
  - `src/routes/auth.tsx`
  - `src/routes/api/public/auth/session.ts`
  - new client-safe `src/lib/return-url.ts` (the allowed list is served from the registry)
  - tests
- **Manifest:** no change.
- **Republish IQs?** Not if the IQ already sends `redirect=`. If ProductIQ doesn't, it needs a one-line change. I'll report that, not make it.
- **How to test:**
  - New user from ProductIQ, with and without email confirmation: you end up back on ProductIQ.
  - Signed-in user: you're sent straight back.
  - Addresses like `evil.com` and a random `*.lovable.app` are rejected and you land on the dashboard.

## 2. One "unlock" link straight to payment — third

- **What happens today** (signed in, on a trial, one locked result) when you click a `signup_trial_*` link:
  - The trial check sees you as already subscribed and sends you to the Hub dashboard.
  - You never see a sign-up form, pricing or checkout.
  - If the IQ adds `redirect=`, you're sent back to the IQ with no checkout.
  - Either way you can't pay.
- **Fix:** publish `deep_links.unlock = /auth?intent=unlock&redirect=<result address>`. On the Hub:
  - **Signed out:** sign in or sign up first, then continue.
  - **Signed in:** you see a short "choose your plan" step (Growth / Complete / Complete annual, plus "just this assessment" at the price set in the manifest), then Stripe checkout. When payment works, Stripe sends you back to the checked result address. If you cancel, you go back there too.
  - **No result address:** you go back to `/report/<submission>` when a submission id is given, otherwise to the dashboard.
  - The single-assessment purchase is the "just this assessment" option. It goes through the same checkout with the same price and is tied to that assessment key.
- **Also fixed:**
  - Map `monthly`/`quarterly`/`annual` to the existing price names, so old links can choose a price.
  - Stop "has a return address" from skipping checkout when the link asks for payment.
- **Not touched:** prices, products, Stripe settings and webhooks.
- **Files:**
  - `src/routes/auth.tsx`
  - `src/lib/auth-checkout.ts` plus tests
  - possibly a small plan-choice component
  - manifest, SDK, `llms.txt`, docs, `PLAYBOOK.md`
- **Manifest:** goes to 1.13.x. Old links keep working.
- **Republish IQs?** Their current "Start a plan" links already improve once old plan names map to real prices. To show the picker and come back to the result, each IQ swaps to `unlock` and republishes.
- **How to test:** checkout is intercepted, so nobody pays.
  - Trial user with a locked result: picker, then checkout with the right price and a return address that points back to the result.
  - New user: sign up, then picker.
  - Active subscriber buying one extra assessment: reaches checkout.
  - Addresses not on the registered list fall back to the dashboard.

## 5. Dashboard "Start <IQ>" goes to the home page — fourth

- **Where the addresses come from:** manifest `assessments[].url`, read in `src/lib/dashboard.server.ts`.
- **Fix:**
  - Add an optional `start_url` per IQ, editable in Admin → Control.
  - It's stored in the app registry's existing record for each IQ, inside a field that already holds extra details, so no table change if one fits. If not, add one column, with no drops or renames.
  - Also publish it as `assessments[].start_url` in the manifest.
  - The dashboard uses `start_url`, falling back to `url`.
- **Files:**
  - `src/lib/hub/app-control.server.ts`
  - `src/lib/dashboard.server.ts`
  - the admin control component
  - manifest and SDK
  - `PLAYBOOK.md`, `llms.txt`
  - tests
- **Manifest:** 1.13.x.
- **Republish IQs?** No. Alex fills in each IQ's start address in Admin.
- **How to test:** after setting ProductIQ's start address, "Start ProductIQ" opens it directly. An IQ with no start address still opens its home page.

## 4. Account first, then a pre-filled start form — last

- **Already available:** `GET /api/public/profile`, signed in with cookies, works from the registered IQ sites. It returns first and last name, email, company, title, role and industry. There's also `PATCH` to fill in gaps.
- **What's missing:** sign-up doesn't ask for role or job title, so new users have those blank.
- **Smallest Hub change:**
  - Add an optional "Job title" field to sign-up and save it.
  - Document the pre-fill contract in the manifest (`contracts.profile_prefill`: which fields, "ask only for what's missing, then PATCH it back").
- **What each IQ does:** on the start page, call the profile feed. If you're signed out, send you to `unlock`/`login` with `redirect=`. Then pre-fill the form and ask only for missing fields.
- **Files:** `src/routes/auth.tsx`, the manifest's contracts section, SDK, docs and `PLAYBOOK.md`.
- **Manifest:** 1.13.x.
- **Republish IQs?** Yes, each IQ, for the pre-filling to show up.
- **How to test:**
  - New user: profile has the title.
  - Existing trial user: the feed returns stored fields.
  - Signed out: 401.

## Recommended order

1, then 3, then 2, then 5, then 4. That matches your guess. Item 2 depends on the safe return check built in item 3, which is why 3 comes before it.

## Rules kept throughout

- Only the Hub writes to HubSpot.
- No new HubSpot fields.
- No secrets in chat.
- Returns only go to addresses in the app registry.
- No migrations that drop or rename anything.
- No Stripe price or webhook changes.
- No edits to IQ projects.

## Conflicts with the current code

- Today's return-address rule allows all of `*.globaledgemarkets.com` and `*.lovable.app`. Tightening it may break preview testing unless preview hosts are registered.
- "An IQ handles its own checkout" is current behaviour. Item 2 replaces it for payment links.
