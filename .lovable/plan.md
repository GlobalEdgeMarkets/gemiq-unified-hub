# TariffIQ fields to HubSpot, written by the Hub

## Step 1 result: HubSpot field check (blocked, must run first)

I couldn't read the HubSpot field list in this session:
- The linked HubSpot connection returned "refresh token expired" (401).
- The Hub's own HubSpot key isn't available to my read-only tools here (401).

Nothing was created or changed. **Step 0 of the build** repeats this read-only check from the running Hub and reports, for every `tariffiq_*` and `gem_tariff_*` field: exact internal name, type, and options. Most important are the eight dimension names (`tariffiq_dim1_hts` … `tariffiq_dim8_intelligence`) and whether role, import spend and tier are dropdowns. I'll stop for your approval before writing any mapping that names a field the check can't find. **No HubSpot fields are created, renamed or deleted in this plan.** If any are missing, I'll list them for a separate approval.

To unblock: reconnect "GEM HubSpot and Lovable" in workspace connector settings, or approve the check running through the Hub's live key.

## Conflicts with the current code (please decide)

1. **The Hub already writes a second set of TariffIQ fields.** On every submit, `gem_tariff_*` fields are written from the same data: score, tier, role, industry, import spend, primary concern, savings, top priorities, status, resume token, 3 PDF links and 8 dimensions. The `tariffiq_*` fields would duplicate them.
   Proposal: keep `gem_tariff_*` unchanged and add `tariffiq_*` alongside, so existing lists and workflows keep working. Retiring `gem_tariff_*` would be a separate decision later.
2. **Blank values can overwrite good ones today.** The current TariffIQ mapping sends `null` for missing detail or dimensions, and the HubSpot update passes those through. This can clear existing values. The new map never sends empty values. I propose applying the same "skip empty" rule to the existing `gem_tariff_*` output, so requirement 3 holds for every TariffIQ field. That changes current behaviour (it no longer clears anything), but no field names change.
3. **Formatting differs.** Existing fields join top priorities with "; " and primary concern with ";". You asked for "A, B, C" on `tariffiq_top_priorities`. The new field uses ", " and the old field stays as it is.
4. **Report links aren't available where the mapping runs.** HubSpot fields are built from each person's latest submission per assessment, and that view only carries detail and dimensions, not `metadata`. The plan adds `metadata` (and whether the result was a trial) to that view, read from the stored submission.
5. **Which submission is used.** Fields come from the person's latest TariffIQ submission, not strictly the one that just arrived. These are normally the same. I'm keeping this rule, which matches every other IQ.
6. **"Trial results must not send report links, the same as today."** Today the Hub doesn't send any TariffIQ metadata links. The current `gem_tariff_pdf_*` fields come from `detail.pdfUrls` and are sent whatever the entitlement. The new rule: the 4 `metadata` links are left out when the result's entitlement is a trial, or when the report is locked. I propose the same gate for `gem_tariff_pdf_*`. Please confirm.
7. **The retry job loses the first-time source fields.** This is already true today and is unaffected by this change. `hs_analytics_source_data_1/2` are still sent only on creation.

## Design: per-assessment field map

A plain data map. Each IQ can add entries later without new code paths:

```text
FIELD_MAP = {
  tariffiq: [
    { from: "detail.industry",          to: "tariffiq_industry" },
    { from: "detail.role",              to: "tariffiq_role" },
    { from: "detail.importSpend",       to: "tariffiq_import_spend" },
    { from: "detail.primaryConcern",    to: "tariffiq_primary_concern" },
    { from: "detail.assessmentStatus",  to: "tariffiq_assessment_status" },
    { from: "score",                    to: "tariffiq_score",  as: "number" },
    { from: "tier",                     to: "tariffiq_tier" },
    { from: "detail.savingsLow",        to: "tariffiq_savings_low",  as: "number" },
    { from: "detail.savingsHigh",       to: "tariffiq_savings_high", as: "number" },
    { from: "detail.topPriorities",     to: "tariffiq_top_priorities", as: "join:, " },
    { from: "dimensions.hts" ... "dimensions.intelligence" -> tariffiq_dim1_hts ... tariffiq_dim8_intelligence (names confirmed in Step 0), as: "number" },
    { from: "metadata.results_url",                to: "tariffiq_results_url",                paidOnly: true },
    { from: "metadata.report_url",                 to: "tariffiq_report_url",                 paidOnly: true },
    { from: "metadata.recommendation_report_url",  to: "tariffiq_recommendation_report_url",  paidOnly: true },
    { from: "metadata.answers_document_url",       to: "tariffiq_answers_document_url",       paidOnly: true },
  ]
}
```

Rules in one function, `applyFieldMap(sub, entries, { trial })`:
- Read the dotted path. Missing, null, empty string, empty array, or a non-number for `as: "number"` means **the key is left out**, never sent as blank.
- `paidOnly` entries are left out for trial or locked results.
- Values are converted to match the HubSpot type confirmed in Step 0. If a dropdown value isn't in HubSpot's options, it's left out and logged, so it never fails the whole update.

These fields are merged into the same single contact update the submission already sends. The `gem_*` fields, source fields, workflows and emails are unchanged.

## Retries and where an admin sees failures

No new mechanism is needed. The existing path covers the new fields because they're part of the same property payload:
- If the HubSpot update fails, the error is saved on the submission (`hubspot_sync_error`) and the full payload is queued in `retry_queue` (`hubspot_upsert`). The scheduled retry job resends it with backoff until it reaches the max attempts, then marks it `dead`.
- An unknown field name is dropped automatically, and the update succeeds with `skipped_props:<names>` recorded on the submission.
- Admins see this in Admin → Control → status (the submissions list with the HubSpot sync error column). PostHog also gets `hubspot_sync_failed` / `skipped_properties`.
- Small addition (optional, confirm): show the count of pending/dead `hubspot_upsert` retries on that same status card.

## Tests (`tests/hubspot-field-map.test.ts`)

- Full TariffIQ payload (paid): all 22 `tariffiq_*` keys are present with exact values, and top priorities are "A, B, C".
- Empty `dimensions` `{}`: no `tariffiq_dim*` keys, and other fields are still present.
- Trial entitlement: no report or results links. Scores and detail are still present.
- Missing `detail`: no detail-derived keys, and no nulls or empty strings anywhere in the output.
- `buildContactProperties` still has the unchanged `gem_*` fields and no `hs_analytics_source*` fields.
- Other IQs: no `tariffiq_*` keys appear.

## Files touched

- `src/lib/hub/assessments/field-map.ts` (new): the map plus `applyFieldMap`.
- `src/lib/hub/assessments/types.ts`: optional `metadata` and `entitlement` on `SubmissionForMapping`.
- `src/lib/hub/assessments/index.ts`: merge field-map output in `buildContactProperties`.
- `src/lib/hub/assessments/tariffiq.ts`: skip empty values and gate PDF links on trial (only if conflicts 2 and 6 are approved).
- `src/routes/api/public/submissions/submit.ts`: pass `metadata` and `entitlement` into history and current.
- `src/lib/hub/admin/legacy-submissions.server.ts`: pass the same fields when re-syncing.
- `src/lib/hub/admin/status.server.ts` and its admin card: retry counts (optional).
- `tests/hubspot-field-map.test.ts` (new).
- `src/lib/hub/AGENTS.md` and `AGENTS.md`: a one-line rule that per-IQ HubSpot fields come from the field map.
- `PLAYBOOK.md`: note the TariffIQ field ownership moving to the Hub.

These are inside the protected Hub paths. This request explicitly targets that area, which I'm treating as permission.

Not touched: database migrations, Stripe, any IQ project, HubSpot fields, workflows or emails, and the manifest. There's no contract change, so no version bump.
