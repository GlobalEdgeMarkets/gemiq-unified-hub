<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## GEM.IQ — agent notes

[`PLAYBOOK.md`](./PLAYBOOK.md) is the authority. If anything here or in the code
disagrees with it, the Playbook wins — fix the code or update the Playbook, don't
leave them divergent.

### Catalog change checklist

Adding, retiring, renaming, or re-tracking an IQ means changing all of these in the
same pass:

1. `src/lib/iq-catalog.ts` — product entry, `DISPLAY_ORDER`, track.
2. `src/lib/hub/manifest.json` — `assessments` entry (+ `track`), bump `version` and
   `updated_at`.
3. `src/lib/hub/sdk.ts` — types if the manifest shape changed, then re-run
   `node scripts/mirror-sdk.mjs`. Never hand-edit `packages/hub-sdk/sdk.ts`.
4. `public/llms.txt` — the file LLMs read; goes stale fastest.
5. `src/routes/sitemap[.]xml.ts` — product paths.
6. `PLAYBOOK.md` — §1 table and the version header.
7. MCP server (`src/lib/mcp/`) — nothing to hand-edit: tool descriptions and the
   `list_submissions` filter derive from `manifest.json` via
   `src/lib/mcp/live-iqs.ts`. After step 2, run the MCP manifest extractor so
   `.lovable/mcp/manifest.json` reflects the new catalog, and check that no tool
   description or `defineMcp` instruction string names an IQ by hand.

Retiring an IQ: add the key to `RETIRED_KEYS` in
`src/lib/hub/assessments/index.ts` and consume `LIVE_REGISTRY`. Do not hand-filter
at call sites. Keep the spec in `REGISTRY` so historical submissions still map.

### Known duplicate

`src/routes/sitemap[.]xml.ts` hardcodes all six product paths instead of deriving
them from `IQ_PRODUCTS`. Correct today, but it is another place the catalog is
restated by hand — a candidate for derivation on a future pass.
- HubSpot calls go through `src/lib/hub/hubspot-transport.ts` (direct with HUBSPOT_SERVICE_KEY, else connector gateway) — one place decides auth/base URL.
- PostHog read-side (admin tracking audit) lives in src/lib/posthog-audit.server.ts using POSTHOG_PERSONAL_API_KEY (phx_, Query:Read); the connector's phc_ token is send-only.
- The IQ app registry (addresses, purge/status links, lifecycle, pause/notice) lives in the `hub_iq_apps` table via `src/lib/hub/app-control.server.ts`; "Delete user", health checks and the public manifest's `control` block all read it — never re-hardcode app addresses.
- Prompts handed to IQ apps (sync + onboarding) are generated from `src/lib/iq-prompts.ts`, so contract changes are made there once.
- Report control lives in `hub_report_settings` (global row + per-app override rows) via `src/lib/hub/report-control.server.ts`; shapes/defaults/lock rule in client-safe `src/lib/report-settings.ts`. Report lock decisions everywhere (dashboard, history, report page) go through `isReportLocked` so admin overrides apply uniformly.
- Hub-built report text is generated once per submission and stored in `submissions.report_content`; app-sent `recommendations` always win over AI, and only an admin "Regenerate" rewrites it.
- "Reset all reports" (`src/lib/hub/admin/reset-reports.server.ts`) runs in small client-driven batches (per-person IQ purge links + clearing gem_* HubSpot fields) and only wipes Hub results in the final step, so a failed run can be repeated safely.
- Follow-up emails are sent by HubSpot workflows, not the Hub: the Hub only writes trigger fields (gem_assessment_submitted_at, gem_report_url, gem_report_locked, gem_entitlement, …) on every submit via buildContactProperties — never re-add Hub-side email sequences.
- Assessment content (questions/weights/tiers) lives in `hub_iq_content` as numbered versions (one draft, one published) via `src/lib/hub/content.server.ts`; the scoring rule is defined once in `src/lib/iq-content.ts` `computeScore` and restated in manifest `contracts.scoring_rule` — change both together.
- End-to-end tests live in `src/lib/hub/e2e/e2e.server.ts` (runs in `hub_e2e_runs`, settings in `hub_e2e_settings`), started only from Admin → Tests (no public endpoints); they only ever create or delete addresses matching the configured `<local>+gemtest-…@<domain>` pattern.
- Admin (`src/routes/admin.tsx`) is a sidebar shell selecting pages via the `?section=` search param (NAV list); shared card/chip/result primitives live in `src/components/admin/ui.tsx`, and buttons show plain-language results, never raw JSON.
- The combined GEM.IQ score rule lives once in client-safe `src/lib/composite.ts` (`computeComposite`) and is restated in manifest `contracts.composite_rule`; weights/stages/min-for-stage and the Hub-wide methodology are stored in `hub_composite_settings` (singleton) via `src/lib/hub/composite.server.ts` — dashboard, HubSpot sync and /methodology all read it.
- Per-assessment methodology and "why we ask this" are optional fields on Hub content (`methodology`, `sections[].rationale`, `questions[].rationale`), so additive changes don't bump the manifest version.
