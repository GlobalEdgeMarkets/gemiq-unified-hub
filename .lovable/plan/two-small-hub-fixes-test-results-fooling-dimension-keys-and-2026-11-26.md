# Two small Hub fixes: test results fooling "Dimension keys", and the admin dead-end page

## A. Test results fooling the "Dimension keys" line

### 1. What created the six gemtest results (found, not changed)
- They come from **Admin → Overview → "Run all quick tests"**. That button sends one "quick" test per assessment (the same as pressing a quick test on the Tests page). Each one posts an anonymous result to the Hub's own submit link with `score: 58, dimensions: {}`.
- **"Check all now" does not create results.** It only checks app health.
- **No daily job creates results.** The daily job only *deletes* old test people.
- Records: `hub_e2e_runs` has 7 test runs, none cleaned up yet. All six from 18:23 UTC today are there, plus one older TariffIQ run.
- **HubSpot:** yes. Each test result goes through the normal submit path, so it creates or updates a HubSpot contact under the gemtest address. The test then checks that contact. The new-result email to staff is skipped for test addresses.

### 2. Health line reads the latest real result
- Only in `adminListApps` (Health & settings): for each assessment, read the latest ~25 results with their email address. Skip any that match the existing test-address rule (`matchesTestPattern` with the saved base address, the same rule cleanup and the submit email skip use). Then check the first real one.
- If there are no real results, the line shows **"no submissions yet"**. Today a missing row shows the same thing through `describeDimensionCheck(null)`; I'll confirm that wording and change it if needed.

### 3. Test results carry realistic dimensions, and the run checks them
- `startQuick` builds `dimensions` from the manifest's `dimensions.by_assessment[key]`: every key gets a value from 0 to 100 (fixed and predictable, e.g. 40 + 5×index, capped at 100). UXIQ has no keys yet, so its map stays `{}`.
- `checkRun` also reads `score_check` and adds a check called **"Dimension keys match the registry"**:
  - pass when `score_check.dimensions.dimension_keys_ok` is true
  - fail with the missing or unknown keys when it is false
  - "not applicable (no registry yet)" for UXIQ
- That check shows up on the Tests page next to the others, and a failure marks the run failed.

### 4. HubSpot cleanup (report only, nothing changes)
- Cleanup deletes test runs that are not yet cleaned up and are older than `keep_days`. The default is 7 days; the saved value has not been checked. Each run is a full "Delete user" covering the Hub, IQ apps, HubSpot contact and Stripe. Addresses that don't match the test pattern are never deleted; they are only marked as cleaned.
- The scheduled job does at most 10 people per day. Today 7 runs are waiting, all from today, so the daily job would remove nothing until they pass `keep_days`. "Clean up" / "Clean up all" on the Tests page can remove them sooner.
- Gemtest contacts from runs that were already cleaned, or that never got a run record, can't be counted without asking HubSpot.
- **"Retry now" does not run cleanup.** It only calls `runHubspotRetry`. Only the scheduled 5-minute job calls `maybeDailyCleanup`, and that job is currently rejected (missing vault `JOB_SECRET`).

## B. Admin "no access" page
- Replace the text with: **"This account doesn't have admin access."** It may also show which account is signed in ("Signed in as <email>."), with no mention of ADMIN_EMAILS.
- Add a **"Sign out and switch account"** button. It posts `{action:"signout"}` to `/api/public/auth/session`, the same sign-out the header uses, then goes to `/auth?redirect=<current /admin URL>`.
- Who counts as an admin, and how the allowlist works, stay the same.

## Files I would touch
- `src/lib/admin.functions.ts`: change only the health query in `adminListApps`.
- `src/lib/hub/e2e/e2e.server.ts`: the dimensions in `startQuick`, plus the new check in `checkRun`. A small pure helper `buildTestDimensions(key)` goes in client-safe `src/lib/hub/dimensions.ts`.
- `src/lib/hub/dimensions.ts`: the helper above, and the "no submissions yet" wording if needed.
- `src/routes/admin.tsx`: wording and button on the no-access page.
- `src/lib/hub/AGENTS.md`: one line saying quick tests send registry dimensions and the health line ignores test addresses.
- `roadmap.md`

## Tests I would add
- `tests/dimensions.test.ts` (extend):
  - `buildTestDimensions` returns every registry key with a 0–100 value for gtmiq, salesiq, productiq, aitransformiq and tariffiq, and `{}` for uxiq
  - running the result through `checkDimensionKeys` gives `dimension_keys_ok: true`
- `tests/health-latest-real.test.ts`:
  - with a test row newest and a real row older, the real row is picked
  - with only test rows, the result is "no submissions yet"
  - this needs the picking step pulled out as a small pure function
- No test for the button. It is markup, and I'd check it with a quick browser run instead.

## Conflicts and notes
- **Out-of-bounds area:** `src/lib/hub/**` is normally off-limits. This request clearly asks for e2e and dimension changes there, so I'm treating it as allowed for `e2e.server.ts`, `dimensions.ts` and `hub/AGENTS.md` only.
- **There are already two test-address rules.** `admin.functions.ts` (around line 500) and `report-control.server.ts` (around line 386) use a looser `/\+(gemtest|checkly)-/` check that ignores the base address. As asked, I'll use the stricter `matchesTestPattern` and leave those two alone, but they could drift apart.
- **Hub content questions:** if an assessment's published Hub content uses section keys that differ from the registry, test results would still pass the check (the check is against the registry). That's fine for the health check.
- **Test results reach HubSpot:** with real dimensions, test contacts will also get filled-in dimension fields (e.g. `gem_tariff_*` for TariffIQ). They are test contacts and get cleaned up, but flag it if you'd rather not.
- Nothing is published, and no migrations, HubSpot, Stripe or IQ project changes are made.
