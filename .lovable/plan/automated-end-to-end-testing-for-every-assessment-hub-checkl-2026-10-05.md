# Automated end-to-end testing for every assessment (Hub + Checkly)

## Goal
Checkly takes a real assessment on each live IQ, on a schedule. Then the Hub confirms everything that should have happened afterwards: the Hub result, report link, HubSpot fields, marketing contact status and workflow enrollment. Results show in a new **Tests** tab in Admin. Test contacts are cleaned up automatically.

## How one test run works
```text
Checkly ──► Hub: "start a test for TariffIQ"   → Hub creates alexr+checkly-tariffiq-<run>@social2b.com
                                                 as a ready-to-use account (no confirmation email needed)
Checkly ──► opens TariffIQ, signs in, starts trial, answers, submits, sees result page
Checkly ──► Hub: "check run <id>" (retries for up to 3 min)
Hub     ──► checks Hub result, report link, HubSpot fields, marketing status, workflows
Hub     ──► returns pass/fail per check → Checkly passes or alerts you
Nightly ──► Hub deletes test contacts older than 7 days (Hub, IQ apps, HubSpot, Stripe)
```

## What gets built
1. **Test runs record**: each run's assessment, test address, time, each check's pass/fail and the final result.
2. **Only safe test addresses**: the test endpoints work only for `alexr+checkly-…@social2b.com` addresses and only with a secret key. No real customer can be touched.
3. **Start endpoint**: creates a fresh, already-confirmed test account with the trial, and returns the address and a one-time password for Checkly.
4. **Check endpoint** verifies:
   - the Hub stored the result (score, tier, content version)
   - the report page link exists, and stays locked for a trial
   - HubSpot fields: assessment name, score, tier, report link, submitted-at, entitlement = Trial, report locked = Yes
   - the contact is a marketing contact
   - the contact joined Set marketing contact, Day 2, Day 5 and Day 90
5. **Hub-only quick test** (button in Admin, no Checkly needed): sends a test result straight to the Hub for any assessment and runs the same checks. Useful after changing HubSpot.
6. **Cleanup**: nightly, plus a "Clean up now" button. It reuses the existing Delete user flow for test addresses older than 7 days, and removes them from the workflows first so the Day 2/5/90 emails don't arrive later.
7. **Admin → Tests tab**:
   - a pass/fail grid per assessment for the latest run, plus history
   - **Run quick test** for each assessment
   - **Copy Checkly test** for each assessment: a ready-to-paste script, built from that assessment's saved address so new assessments get one automatically
   - test settings: on/off, which assessments, the address pattern, how long to keep test contacts
8. **Assessment page markers**: one prompt (from the existing prompt builder) asks each IQ to add stable labels to its Sign in, Start, answer, Submit and Result elements so the Checkly script works on all of them. It's pasted into each assessment once, like the earlier prompts.
9. Docs: PLAYBOOK, AGENTS.md and the new-assessment checklist gain "add the test markers".

## Scope note
This touches protected Hub areas: new test endpoints under `api/public/e2e/` and new server code under `src/lib/hub/e2e/`. Approving this plan approves that exception. Existing submit, billing and HubSpot logic is reused, not changed. The only exception is that test submissions skip the internal "new submission" notification email to info@ and alexr@.

## What you need to do
**Before I build (5 minutes)**
1. Send an email from another account to `alexr+checkly-test@social2b.com`. Tell me whether it arrived in alexr@social2b.com. If it didn't, your email provider doesn't support "+" addresses and I'll use another pattern.
2. Optional: create a filter in that inbox for messages to `+checkly`, with the label "GEM test" and skip the inbox, so test emails don't clutter it.

**After I build**
3. Publish GEM.IQ.
4. In **Admin → Tests**, press **Run quick test** for TariffIQ and tell me what shows.
5. In **Admin → Control → Assessment health**, copy each assessment's new **Test markers prompt**, paste it into that assessment and publish it.
6. Create your Checkly account at checklyhq.com, using the paid plan or the trial.
7. In Checkly, go to **Environment variables** and add `GEM_E2E_SECRET`. I'll create the value and show you where to copy it in Admin → Tests.
8. For each assessment: in Checkly, choose **Create → Browser check**, paste the script from **Copy Checkly test**, set it to run every 24 hours (or weekly) from one location, and set alerts to email alexr@social2b.com.
9. Run each check once in Checkly and send me the result. The Tests tab in the Hub will show the same run.

## Limits to know
- Tests confirm that contacts join the workflows. They can't wait 2, 5 or 90 days for the emails, and cleanup removes the contacts before then.
- Each run briefly adds one HubSpot marketing contact until cleanup.
- The first Checkly run per assessment may need small script fixes until its markers are in place.

## Technical details
- Tables: `hub_e2e_runs` (id, assessment_key, email, source quick|checkly, status, checks jsonb, started_at, finished_at) and `hub_e2e_settings`, with GRANTs and admin-only RLS.
- Secret: `GEM_E2E_SECRET` (generated), checked with constant-time compare in `/api/public/e2e/start`, `/check/$id` and `/cleanup`.
- Accounts created with the admin client, `email_confirm: true`, plus a trialing subscription row matching the normal trial path.
- HubSpot checks go through `hubspot-transport.ts`: contact properties, `hs_marketable_status`, and workflow membership via the automation enrollment API, matched against workflow IDs stored in settings.
- Cleanup piggybacks on the existing 5-minute job, running once per day, and calls `delete-user.server.ts`.
- Checkly scripts are Playwright, generated in `src/lib/iq-prompts.ts` alongside a new `testMarkersPrompt`.
