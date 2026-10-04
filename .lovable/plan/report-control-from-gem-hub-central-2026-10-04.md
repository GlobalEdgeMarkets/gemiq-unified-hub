# Report control from GEM Hub Central

The goal is to control reporting for all six assessments from the Hub. There are three layers: shared report settings that every assessment follows, Hub-built reports, and a new Reports area in Admin.

This deliberately works inside the protected Hub areas (settings file, Hub data, public links), as requested.

## 1. Shared report settings (Admin → Reports → Settings)

Default settings for all assessments, with optional changes per assessment:
- **Sections:** turn on or off and reorder: Summary, Score & tier, Dimension breakdown, Strengths, Gaps, Recommendations, Next steps, Talk to GEM.
- **Locking:** what trial users see (score only / score + tier / score + tier + dimensions), and which sections unlock with a plan.
- **Wording:** report title pattern, intro line, disclaimer, closing "Talk to GEM" message and button text.
- **Tier labels and colours:** one shared set of names and score ranges, with a per-assessment override.
- **Who builds the report:** "Assessment" (current behaviour) or "Hub" (option 2), set per assessment.

These go out to the assessments through the live settings they already read every 5 minutes (settings version 1.8.0).

## 2. Reports built by the Hub

- A new report page on the Hub for each result, which follows the shared settings and the brand.
- For assessments switched to "Hub", their "View report" link points here and the dashboard opens it directly.
- Recommendations: each assessment can send its own recommendation text along with the result. If a section has none, the Hub writes it with AI from the scores. That text is saved once per result and never rewritten on its own.
- A "Download PDF" button using the browser's print-to-PDF with a print-friendly layout. This needs no extra tools.

## 3. Admin → Reports (every result in one place)

- A table of all results across the six assessments: filter by assessment, email, date, tier, and whether the report is locked or unlocked. Shows score, tier, plan status, and a link to open it.
- Actions on each result:
  - **Open:** preview the report exactly as the user sees it.
  - **Unlock / Re-lock:** an admin override, recorded with who did it and when.
  - **Resend:** email the user their report link (with Lovable's built-in email, set up the first time it's used).
  - **Regenerate:** rebuild the AI recommendations.
  - **Hide:** remove the result from the user's dashboard without deleting it.
- Summary cards: results this week, average score per assessment, how results spread across tiers, and how many locked reports turned into paid plans.
- Export the table to CSV.

## 4. One more prompt per assessment

Admin → Assessment health gets a "Report prompt" button for each assessment. The prompt tells the app to:
- follow the shared sections, wording, locking and tier labels;
- send its recommendation text with each result;
- when set to "Hub", send users to the Hub's report link instead of its own page.

Health checks also confirm each app is on settings 1.8.0 and reports its report mode.

## Technical details

- Migration: `hub_report_settings` (one global row plus an override row per app key, stored as JSON), new columns on `submissions`: `report_unlocked_override bool`, `report_hidden bool`, `report_content jsonb`, `report_generated_at`, `admin_actions jsonb[]`. Admin-only access goes through the existing `requireHubAdmin` and service-role server code. Users read their own results through existing policies. GRANTs are included.
- `src/lib/hub/report-control.server.ts`: get/merge/update settings, `resolveReportAccess(submission, subscription)`, generating and saving AI recommendations (Lovable AI Gateway, `openai/gpt-6-astra`).
- Manifest 1.8.0: `report` block (sections, locking, copy, tiers, mode per app), `contracts.report_fields`. Update `sdk.ts`, run `scripts/mirror-sdk.mjs`, and update `/api/public/manifest` to merge live report settings.
- Submit endpoint accepts optional `recommendations` and `report_url`. `history.ts` respects hidden/override/locking.
- Routes: `/report/$id` (signed-in owner or admin), Admin gets a tabbed layout: Control · Reports · Tracking · Users.
- `iq-prompts.ts`: `reportPrompt(app, version)`.
- Update PLAYBOOK.md, AGENTS.md and llms.txt.
