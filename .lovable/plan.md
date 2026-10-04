# GEM Hub Central as the control center for all assessments

Goal: changes made in GEM Hub Central reach every assessment automatically wherever possible, the Admin page shows which apps are in sync, and adding a new assessment becomes a guided process.

Built in three phases. Each phase works on its own, so we can stop after any of them.

## Phase 1: Shared settings that every app reads live

GEM Hub Central already publishes a public settings file (the "manifest") that the apps read their prices from. This phase extends it to cover everything shared:

- Pricing, trial rules, and which parts of a trial report stay locked (already there; tidied up)
- Guarantee and checkout wording
- Branding: logo links, colours, fonts, footer links
- A notice or maintenance message for each app, plus a "pause this app" switch
- The list of PostHog activity names each app should send, and the HubSpot fields it fills in
- A settings version number, so apps can report which version they're on

The Admin page gets a "Shared settings" screen to edit notices, pause switches and wording without a code change. These values are saved in the backend and merged into the published settings file. Prices stay code-controlled because they're tied to Stripe.

You get one prompt to paste into all six apps: "always read these from GEM Hub Central, and show the notice or pause screen when told to". After that, these settings sync with no further prompts.

## Phase 2: An "in sync" check on the Admin page

- Each app adds one protected status link, which uses the same shared key as the delete link. It reports:
  - its settings version
  - whether sign-in, checkout, the delete link and PostHog tracking all work
- A new Admin "Assessment health" panel calls each app and shows a green, yellow or red light, the last check time, and what's wrong.
- When an app is behind, the panel shows the exact prompt to paste into that app.
- The panel also folds in the existing PostHog tracking check, so missing activity appears as a yellow light.

The Phase 1 prompt includes adding this status link, so the six apps only need one paste.

## Phase 3: Guided "Add a new assessment" process

A step-by-step screen in Admin:

1. **Details:** name, key, web address, track (Capability or Specialist), short description, theme image.
2. **Register:** GEM Hub Central records the new assessment as "onboarding" (not shown to the public yet).
3. **Prompt:** generates one complete prompt for the new app. It covers sign-in, reading shared settings, pricing and report locking, results submission, the delete link, the status link, PostHog, HubSpot and branding. The prompt is pre-filled with the app's own key and addresses.
4. **Verify:** a checklist that turns green as each piece is confirmed live:
   - the status link answers
   - the delete link accepts a test
   - a test result arrives
   - PostHog sees its site
5. **Go live:** one final code pass adds it to the catalogue, sitemap, the file AI assistants read, the AI connection and the HubSpot fields. This step stays a code change, done by me in chat. The screen gives you the exact one-line request to send me.

## What still needs a prompt in the apps

New behaviour, not just new settings. The health panel shows when that's needed and gives the prompt.

## Technical details

- **Scope fence:** approving this plan authorises edits to `src/lib/hub/**`, `src/routes/api/**` and `supabase/migrations/**` for this work only.
- **Shared settings data:**
  - A new backend table holds the editable values (notices, pause flags, wording), with admin-only writes and public reads limited to those safe columns.
  - `api/public/manifest` merges the stored values over `manifest.json`.
  - Manifest version goes to 1.7.0, with the new fields added to `sdk.ts` and the copy regenerated via `scripts/mirror-sdk.mjs`.
- **Health links:**
  - Each app exposes `POST /api/public/hub-status` (or its backend function equivalent), checking `x-hub-purge-secret`.
  - The returned JSON includes `manifest_version`, a set of `checks` and `app_version`.
  - The app addresses are stored next to the existing purge addresses, so there's one list of app addresses.
- **Onboarding records:** a new backend table holds each assessment's onboarding status and checklist results.
  - Live catalogue changes still follow the AGENTS.md catalog checklist, run as one code pass.
  - The app's own code can't write to its catalogue files, so the screen never pretends to.
- **Secrets:** no new secrets. The health link reuses `HUB_PURGE_SECRET`.
