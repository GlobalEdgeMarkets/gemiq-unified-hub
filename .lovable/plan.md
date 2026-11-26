# Fix the HubSpot retry job

## What I found (evidence)

- **Schedule exists and is on.** A database scheduled job `gemiq_hubspot_retry_worker` runs every 5 minutes (active = true). It posts to the stable published address `project--d4b3f62b-…lovable.app/api/public/jobs/retry-hubspot`. 288 runs in the last 24 h, last at 17:55 UTC today, all marked "succeeded".
- **Every call is rejected.** The last 5 recorded responses from the app are all `403 forbidden`. "Succeeded" only means the request was sent, not that the app accepted it.
- **Root cause:** the job reads the password header from the database's own secret store (`JOB_SECRET` in the vault), but **that vault entry does not exist** (count = 0). The header goes out empty, the app's check `secret === process.env.JOB_SECRET` fails, and it returns 403 before touching the queue. That is why attempts stay at 0, last_error stays null and next_attempt_at never moves. The app-side `JOB_SECRET` is set, so only the database copy is missing.
- **Admin "Retry now":** nothing exists today. The admin server functions cover bootstrap/import/reset, not retries.

## Plan

1. **Smallest fix (manual step, see below):** put the same `JOB_SECRET` value into the database vault so the existing schedule's header matches. No schedule or migration change. Alternative if Alex can't recover the value: generate a new one and set it in both places.
2. **Share the retry logic.** Move the handler body into `runHubspotRetry()` in a new server module so both the scheduled job and the Admin button call the same code. The public route keeps its secret check unchanged.
3. **Rebuild properties from the submission.** For each job with a `submission_id`, rebuild the HubSpot properties from the stored submission with the current mapping (`buildContactProperties` → `dropEmpty` + trial/locked link gate), the way submit does now. To do that, pull the "build properties for a submission" steps out of `submit.ts` (history, composite, entitlement, report lock) into one shared function used by both, so they can't drift apart. Fallback: if the submission is missing or the rebuild fails, send the stored payload after `dropEmpty` and the link gate (locked → no report link). Also pass `{ label: "GEM.IQ", detail }` and record skipped fields, matching submit.
4. **Admin "Retry now" button** next to "HubSpot retries: N pending, N failed permanently" on the Control status card. An admin-only server function (`requireHubAdmin`) runs `runHubspotRetry()` in-process, with no JOB_SECRET in the browser. It shows a plain-language result ("2 sent, 0 re-queued, 0 failed permanently") and refreshes the counts. Retry timing and limits stay the same.
5. **Other jobs on the same trigger (list only, not fixed):**
   - Daily cleanup of old end-to-end test contacts (`maybeDailyCleanup`) runs inside this same handler, so it has also been blocked by the 403. It starts working again once step 1 is done.
   - No other scheduled jobs exist in the database (only job 1). The admin endpoints that use `JOB_SECRET` (migrate-readinessiq, import-legacy-users/submissions, bootstrap-hubspot-schema) are run by hand, not on a schedule.
6. **Tests** (`tests/hubspot-retry.test.ts`, with HubSpot and the database mocked):
   - Rebuild path: properties come from the current mapping, empty values are dropped, trial/locked hides the report link.
   - Fallback path: a stored payload with empty strings and an ungated link gets cleaned before sending.
   - Success marks the job done and updates the submission. A failure increments attempts with the same backoff, and the job goes dead at max_attempts.
   - Secret check: the route returns 403 without the secret or with the wrong one.

No retry is run against HubSpot during planning or while testing. The first real run happens after Alex's step or when he clicks "Retry now".

## Files I would touch

- `src/routes/api/public/jobs/retry-hubspot.ts`: becomes a thin wrapper (secret check + `runHubspotRetry`)
- `src/lib/hub/hubspot-retry.server.ts` (new): shared retry runner
- `src/lib/hub/submission-properties.server.ts` (new): shared property builder pulled out of submit
- `src/routes/api/public/submissions/submit.ts`: uses the shared builder (same output)
- `src/lib/admin.functions.ts`: `adminRetryHubspotNow`
- The Control status card component next to the retry line (the one that reads `status.server.ts`): "Retry now" button
- `tests/hubspot-retry.test.ts` (new)
- `AGENTS.md`: one rule saying retries rebuild from the submission through the shared builder
- `roadmap.md`

Note: this touches `src/lib/hub/**` and `src/routes/api/**`, which are scope-fenced. Approving this plan counts as explicit permission for these files only.

## Manual step for Alex

- **Add `JOB_SECRET` to the database vault with the same value the app uses.** Saved secrets can't be read back, so the practical path is: open Project Settings → Secrets, generate a new `JOB_SECRET` value and copy it before saving. Then let me store that same value in the vault. I'll do that through a one-off database statement after approval, with Alex pasting the value into a secure form, never into chat. After that, the next 5-minute run should return 200, and I'll confirm it from the response log.
- Publishing is not needed for step 1. The button and the rebuild logic need a Hub publish to reach the live site.

No migrations, no HubSpot property, workflow or email changes, no Stripe or IQ changes.
