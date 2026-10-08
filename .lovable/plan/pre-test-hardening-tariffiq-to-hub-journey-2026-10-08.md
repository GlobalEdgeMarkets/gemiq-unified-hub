# Pre-test hardening: TariffIQ to Hub journey

## Part A — Findings

1. **Signing up does NOT start a trial.** `api/public/auth/session.ts` (signup, lines 31-37) only creates the account. A trial exists only after a Stripe checkout with `trial: true` (`billing/create-checkout.ts` line 12, line 64 `trial_period_days: 7`), and the `subscriptions` row is written by the webhook / `subscription-sync.server.ts` (line 54-56). `auth.tsx` line 146 starts trial checkout only when `trial=1` or `plan` is set and there is **no** return-to-IQ link (an IQ handles its own checkout). So someone who signs up from TariffIQ has **no trial and no entitlement**. Because TariffIQ removed its plan gate, their submit gets `entitlement: "none"` (`submit.ts` line 185): it is saved, it isn't counted as trial use, and `isReportLocked` returns false for it (see 3), so the full report shows for free.
2. **Unlock checkout.** `startCheckout(lookupKey)` without `trial: true` creates a checkout with **no trial** (`sdk.ts` line 320, `create-checkout.ts` line 64). Anna's "Start your 7-day trial" label came from TariffIQ's own text or its passing `trial: true`. That needs checking on TariffIQ's side. If someone already on a trial completes it, Stripe opens a **second** subscription (status `active`) next to the trialing one, because nothing cancels the trial. What check-subscription then reports depends on which row `selectCurrentSubscription` picks. It may return the old trialing row, giving `trialing: true`.
3. **`active && !trialing` is not reliable** after Unlock: it fails if the trialing row is picked, and also before the webhook arrives. Report lock rule (`report-settings.ts` line 154-159): an admin override wins; otherwise locked only when `entitlement === "trial"` and no paid plan is active. `submit.ts` line 116 sets `hasPaidSub` only when `status === "active"`, so trial results stay locked until the plan is active.
4. **Sign out.** The endpoint handles `signout` (`session.ts` line 25-26). Supabase's SSR `signOut()` sends cookie removals through `setAll`, and those are added as `Set-Cookie` with the same Domain (lines 41-42). This should work. The risk: if the access token has already expired, `signOut()` may fail before clearing cookies, and the user stays "signed in". Not yet confirmed in a browser.
5. **`attempt_id` is ignored.** It's not in `SubmissionPayloadSchema` and not used in `submit.ts`. The only protection against duplicates is a 10-minute check on email plus assessment (lines 171-182).
6. **Checkly no longer exists** in this project. `rg -i checkly` finds nothing, and the Hub's own tests send results through the API without typing into TariffIQ. There is no PIN step to remove.

## Part B — Proposed changes

**a) Make Unlock actually unlock. Recommendation: both sides change, with the Hub as the source of truth.**
- Hub: in `create-checkout`, when the user already has a trialing subscription and asks for a non-trial plan, **convert the existing subscription** instead of opening a new checkout. Either end the trial now (`trial_end: "now"`, charge the card already on file) or, with no card, open a Stripe checkout in setup mode and then end the trial. The result is one subscription, status `active`, so trial results unlock through the existing rule.
- Hub: make `selectCurrentSubscription` prefer `active` over `trialing`, as a safety net.
- Hub: add `GET /api/public/submissions/status?id=` returning `{ report_locked, entitlement }` from `isReportLocked`, plus a `hub.results.status(id)` SDK method (then regenerate the SDK mirror and bump the manifest version).
- TariffIQ: after Unlock returns, check `hub.results.status(submissionId)` and unlock when `report_locked === false`, instead of guessing from `trialing`.

**b) Ignore repeat submits per attempt.** Add an optional `attempt_id` (string, max 100 characters) to the schema. Add a `submissions.attempt_id` column with a partial unique index on (`email`, `assessment_key`, `attempt_id`) where `attempt_id` is set. In `submit.ts`, before checking entitlement, look for an existing row by user, or by email when signed out, plus assessment and `attempt_id`. If found, return the original `{ id, report_url, report_locked }` with `deduped: true`, and don't count trial use, spend a credit or sync HubSpot. If the insert hits a unique-key conflict, re-read the row and return it the same way. Submits without `attempt_id` keep the current behavior.

**c) Sign out.** Make it robust: after `signOut()`, always send expired versions of every `sb-*` cookie in the request with the same Domain, even if `signOut` errored. Then check sign-out in a browser.

**d) Checkly.** Nothing to do (see A6).

**e) Trial on sign-up.** No free trial without a card is given today, by design: the trial needs a card so it can convert automatically. Recommendation: keep it that way, and stop people with no entitlement from getting full results for free:
- Hub: when a signed-in user with no trial, plan or credit submits, the result is still saved but marked `entitlement: "none"` and locked. `isReportLocked` treats `"none"` like `"trial"`.
- TariffIQ: put a light plan gate back on, before the questions or on the results page: "Start 7-day trial" (`startCheckout(key, { trial: true })`) or "Buy single $179".
- Alternative, if you'd rather: give every new account a 7-day trial without a card (a Hub-only `subscriptions` row with no Stripe link). This is a bigger change to pricing and billing, so it's not recommended without your decision.

## Prompt for TariffIQ (after the Hub changes)

```text
Hub contract updates — please apply:
1. Update the Hub SDK (pull latest hub-sdk). Use hub.results.status(submissionId) as the only
   unlock signal: after "Unlock now" checkout returns, poll it (every 2s, up to 20s) and unlock
   when report_locked === false. Remove the "active && !trialing" check.
2. "Unlock now" must call hub.subscription.startCheckout(TARIFFIQ_LOOKUP_KEY_MONTHLY, { successUrl, cancelUrl })
   WITHOUT trial: true, and its button text must say "Unlock full report" — never "Start your 7-day trial".
3. Restore an entitlement gate before scoring: if hub.subscription.check().entitled is false, show
   "Start 7-day trial" (startCheckout(key, { trial: true })) and "Buy single assessment" options.
4. Keep sending attempt_id (one per finished attempt); never resubmit when re-opening results.
```

## Technical details
- Files: `billing/create-checkout.ts`, `lib/hub/supabase-server.ts` (`selectCurrentSubscription`), `submissions/submit.ts`, new `submissions/status.ts`, `lib/hub/schemas.ts`, `lib/report-settings.ts`, `auth/session.ts`, `lib/hub/sdk.ts` + mirror, `manifest.json`, one migration (`attempt_id` + partial unique index).
- Tests: idempotent repeat doesn't count toward trial use; `entitlement "none"` is locked; `active` is picked over `trialing`.
- Nothing gets published.
