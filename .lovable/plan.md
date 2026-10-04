# Plan: Hub-controlled questions and scoring + follow-up emails

## Part 1 — Questions, scoring and tiers controlled from GEM Hub Central

**What you get**
- A new **Content** tab in Admin. Pick an assessment and edit its sections, questions, answer options, weights, score tiers and the recommendation text for each tier.
- **Draft and publish** for each assessment. Edits stay in a draft until you press Publish. Every publish is saved as a numbered version, and you can roll back with one click.
- **Preview**: take the draft assessment yourself before publishing.
- **Import**: a one-time "Pull current content" per assessment. The assessment sends its current questions to the Hub, so you start from what is live today and don't have to retype it.
- Every result records which content version produced it, so old reports stay correct after changes.

**What each assessment does (one prompt each)**
- On start, it loads its published questions and scoring from the Hub, the same way it already loads settings. It falls back to its built-in questions if the Hub can't be reached.
- It scores answers using the Hub's weights and tiers, and sends the content version with each result.
- It answers a new "export content" request for the import step.
- Its health check turns yellow when it is running an older content version.

## Part 2 — Follow-up emails based on score and tier

**What you get**
- A new **Follow-up** section in Admin → Reports. For each assessment (or for all of them), set a short series of emails:
  - Right after a result: "Your report is ready", already in place.
  - Day 2: advice by tier (different text for low, mid and high tiers).
  - Day 5, trial users only: "Unlock your full report", with the plan button.
  - Day 90: "Retake to see your progress".
- Each email can be turned on or off, and its timing and wording can be edited. Assessment name, score, tier and report link fill in automatically.
- Emails stop when the person starts a plan (for the unlock email) or unsubscribes. Every email has an unsubscribe link.
- A log in Admin shows what was sent, to whom, and whether it was opened, if tracking is available.
- "Delete user" and "Reset all reports" also cancel pending emails.

**Nothing changes inside the assessments for Part 2.** It runs from results the Hub already receives.

## Rollout order
1. Part 2 first, because it is Hub-only and works the same day it is published.
2. Part 1 Hub side (Content tab, import, versions), then one prompt per assessment, starting with GTMIQ.

## Technical details
- New tables: `hub_iq_content` (key, version, status draft/published, JSON body: sections/questions/options/weights/tiers/tier_recs, published_by/at), `hub_followup_rules` (app key or global, step, delay_days, audience all/trial/tier, template copy, enabled), `hub_followup_queue` (submission_id, email, step, send_at, status, sent_at), `email_unsubscribes`. GRANTs + RLS service-role/admin only.
- Manifest 1.9.0: `contracts.content_endpoint` (public GET `/api/public/content/<key>` returning the published version, cached), `contracts.content_export` (Hub POSTs to app with x-hub-purge-secret), `submit_extras.content_version`. sdk.ts updated, mirror re-run. `iq-prompts.ts` gains a `contentPrompt`.
- Scoring stays inside each app (the Hub publishes the weights; the app computes). The Hub re-checks the score on submit and flags mismatches in Admin.
- Follow-up: on submit, rows are queued in `hub_followup_queue`. A cron endpoint `/api/public/cron/followups`, protected by a secret header, sends due emails through the existing transactional email templates. A signed token link on `/unsubscribe` lets people opt out.
- delete-user and reset-reports delete queue rows. AGENTS.md, PLAYBOOK.md and llms.txt get updated.
