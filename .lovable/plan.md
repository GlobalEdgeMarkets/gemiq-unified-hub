# Item 2 — Checkout and the "unlock" link (detailed plan)

Nothing has been changed. Two decisions for Alex come first; building waits on both.

## Decisions Alex must make first

**D1. Which price the published plan names choose.** Today the sign-in page silently maps `monthly → Complete monthly ($249)`, `quarterly → Complete monthly ($249)` and `annual → Complete annual ($2,490/yr)`. The mapping lives in `src/routes/auth.tsx` and was marked "legacy". The Stripe lookup keys are `gemiq_growth_monthly`, `gemiq_complete_monthly`, `gemiq_complete_annual` and `gemiq_single_assessment`. There is **no quarterly price**, and "monthly" could just as well mean Growth ($149). The code doesn't settle this, so I'm not choosing. Options:
- A (keep today's mapping): monthly = Complete monthly, quarterly = Complete monthly, annual = Complete annual.
- B: monthly = Growth monthly, quarterly = Complete monthly, annual = Complete annual.
- C (recommended): keep A for old links, and also publish clear new links named after the plans: `signup_trial_growth`, `signup_trial_complete` and `signup_trial_complete_annual`. IQs move to the new names, and the old names keep working.

**D2. "Just this assessment" in the unlock picker.** Buying one assessment ($179) gives a credit that is used up on the **next** submission. It does **not** unlock a result that already exists. Options:
- A (recommended): leave "just this assessment" out of the unlock picker and show only the plans. Keep it on the separate "Buy one assessment" link.
- B: keep it, and after payment use the credit to unlock that one result. This is a new unlock rule and needs a small new piece of logic (no webhook or database change, but a new rule worth approving).

## Where `plan=complete` came from

The Hub rewrote the address. The sign-in page's address reader turns `plan=monthly` into `plan=complete` (and `annual` into `complete_annual`), and the router then writes the cleaned values back into the address bar. That's also why `trial=1` showed up as `trial="1"`. So ProductIQ almost certainly sent `plan=monthly` from the manifest. Nothing else in the Hub generates `plan=complete` for that journey. The Hub's own "unlock" links on its report pages do use `plan=complete`, but Alex wasn't on those.

## Exact behaviour, today vs after

"Return" means the checked return address (`src/lib/return-url.ts`), or the dashboard if there is none.

| Case | Today | After |
|---|---|---|
| New user, trial link, **no** return | Sign up → Stripe (7-day trial, card) → dashboard | Same, but after Stripe goes through the new "finishing" step → dashboard |
| New user, trial link, **with** return | Sign up → sent straight to the IQ, **no checkout** (the loop) | Sign up → Stripe trial checkout → finishing step → back to the IQ |
| New user, single link, no return | Sign up → Stripe $179 → dashboard | Same, via finishing step |
| New user, single link, with return | Sign up → back to IQ, no checkout | Sign up → Stripe $179 → finishing step → back to IQ |
| Signed-in, no plan, trial link (either) | No return: Stripe trial. With return: back to IQ, no checkout | Stripe trial checkout → return |
| Signed-in **trial** user, trial link, no return | Bounced to dashboard | "Choose your plan" step → card on file charged now (trial converted, no second subscription) → return |
| Signed-in trial user, trial link, with return | Back to IQ, no checkout | Same as row above → back to IQ |
| Signed-in trial user, locked result, **unlock** (new link) | Link doesn't exist; old unlock went to Complete monthly checkout | "Choose your plan" → trial converted on chosen plan → finishing step → back to the result, now unlocked |
| Signed-out person, unlock | n/a | Sign in / sign up (return kept) → same as row above |
| Signed-in, no plan, unlock | n/a | Picker → Stripe checkout (paid, no trial) → back to result |
| Active **paid** subscriber, trial or unlock link | Trial link: dashboard. With return: back to IQ | Straight to return, no checkout |
| Active paid subscriber, single link | Checkout (extra assessment) | Unchanged (still allowed) |
| Sign-in / sign-up link only (no trial/buy/plan) | Sign in → return | Unchanged |
| Cancel at Stripe | Back to Hub dashboard | Back to return (IQ or dashboard); nothing is charged, no plan created |

## How the return reaches Stripe safely (b)

- Stripe is only ever given **Hub addresses**: success `…/checkout/return?to=<return>&session={CHECKOUT_SESSION_ID}` and cancel `…/checkout/return?to=<return>&cancelled=1`. No IQ address goes to Stripe directly.
- The `to` value is checked twice: before checkout, and again on the return page, using the same rule (live registry hosts plus Hub hosts only). Anything else goes to the dashboard.
- The checkout endpoint's own "allowed address" rule (still `*.globaledgemarkets.com` suffix matching) is narrowed to Hub hosts only, since success and cancel are now always Hub pages.
- **Timing gap:** on return, the finishing page ("Finishing your setup…") asks the existing subscription check up to about every 2 seconds for up to about 20 seconds. That check already pulls straight from Stripe when the webhook is late. It continues once the plan shows as trialing or active (or the credit exists, for single purchases). When the person reaches the IQ, the IQ's gate sees the plan. If 20 seconds pass, it shows "Payment received — your access is being confirmed" with a Continue button, so nobody is silently dropped.
- A trial conversion charges the card on file immediately and already brings the record up to date before replying, so there's no gap there.

## Webhook today (c) — unchanged

- **Trial start / paid subscription:** "checkout completed" on a Hub-owned subscription → reads the subscription from Stripe → saves it (trialing or active) → records "trial_started" or "subscription_started".
- **Paid conversion:** a "subscription updated" event (trialing → active) → saves it → records "trial_converted". The conversion path also brings the record up to date at once.
- **Single purchase:** paid "checkout completed" in payment mode → grants one assessment credit.
- No change to the webhook or its filtering in this item.

## Locked results after paying (d) — partly corrected

- **Confirmed:** the lock is worked out live (`isReportLocked`). A trial or unpaid result unlocks as soon as the person's plan status is **active**, and nothing is rewritten. So a trial-to-paid conversion unlocks existing results immediately.
- **Correction:** during the trial itself, status is "trialing", which does **not** unlock.
- **Correction:** a **single purchase does not unlock** an existing locked result. It only covers the next assessment. See D2.

## Plan picker (e)

- A small Hub page, `/unlock`. Plan names, prices and the plans line come from the manifest pricing; nothing is typed in. Wording can be overridden through approved Messaging keys (`unlock.*`), with built-in text as the fallback.
- It looks like this: "Unlock your full report — choose a plan. Your card on file is charged today." Three cards (Growth $149/mo · Complete $249/mo · Complete $2,490/yr), plus "Just this assessment $179" only if D2 = B.
- For a trial user, the button says the amount that will be charged immediately, because no Stripe page is shown on conversion.

## Manifest, SDK, docs and what IQs change (f)

- Manifest **1.14.0** (additive):
  - `deep_links.unlock = https://gemiq.globaledgemarkets.com/unlock?redirect={return_url}`
  - every trial/buy link documents the optional `&redirect={return_url}`
  - if D1 = C, three new `signup_trial_*` links
  - `contracts` gains one line: "Trial/purchase links always go through Hub checkout; the IQ never runs checkout."
- Hub report pages switch their unlock buttons to the new unlock link.
- SDK types updated and mirrored. `llms.txt`, docs page, Playbook and the IQ prompt generator updated so IQ prompts state the new rule.
- **Each IQ then:**
  1. adds `redirect=<its current page URL>` to "Create an account", "Start your 7-day trial", "Buy one assessment" and the trial-used-up redirect;
  2. points its locked-result "Unlock" button at `deep_links.unlock` with `redirect=<result URL>`;
  3. if D1 = C, switches to the new trial link names.
- IQs should only make these changes after this Hub change is published.

## Files (g)

- `src/routes/auth.tsx` — checkout decision no longer skipped when a return address exists; trial-user branch goes to the picker.
- `src/lib/auth-checkout.ts` — one pure function deciding the next step (signin-only / trial checkout / single / picker / straight back).
- New: `src/routes/unlock.tsx`, `src/routes/checkout.return.tsx`.
- `src/routes/api/public/billing/create-checkout.ts` — success/cancel limited to Hub hosts. Prices, trial days and conversion logic stay the same.
- `src/lib/hub/http.ts` (narrow the checkout redirect check), `src/lib/hub/report-control.server.ts` (unlock_url).
- `src/lib/hub/manifest.json`, `src/lib/hub/sdk.ts`, mirrored SDK, `public/llms.txt`, `src/routes/docs.tsx`, `PLAYBOOK.md`, `src/lib/iq-prompts.ts`.
- D2 = B only: a small unlock-with-credit step.
- No database, webhook, Stripe settings, HubSpot or IQ changes.

## Tests and how to check without charging anyone

- **Unit tests** for the next-step function, one per table row: new/signed-in/trial/paid × with/without return × trial/single/unlock/signin-only. Also the return check on the finishing page (evil.com and a random lovable.app address → dashboard), and plan-name mapping per D1.
- **Preview walkthroughs** with test accounts (`+gemtest` addresses):
  - Requests to start a checkout are intercepted, so no Stripe page opens and nothing is charged. Each case checks the exact request sent: plan, trial yes/no, Hub-only success/cancel, `to` kept.
  - The finishing page is checked with a faked "trialing/active" reply.
  - Cancel is checked by opening the cancel address directly.
- **Cannot be verified without a real payment** (or a Stripe test-mode setup, which this Hub doesn't currently use for live keys): Stripe actually charging the card, the real webhook timing, and trial conversion charging the card on file. Those need one supervised real purchase, refunded afterwards.

## Risks and off switch (h)

- **Risks:**
  - Trial users are charged immediately on conversion. The picker must say this plainly.
  - A wrong D1 choice sends people to the wrong price.
  - IQs adding return addresses before this is published would cause the loop.
  - A slow webhook is covered by the finishing step.
- **Off switch:** one setting, `CHECKOUT_RETURN_FLOW` (set to `off` in Cloud secrets), read on the server. When off, the sign-in page goes back to today's routing and `/unlock` sends people to today's Complete-monthly unlock. If a setting change doesn't take effect without republishing, the fallback is to restore the previous version and republish.
