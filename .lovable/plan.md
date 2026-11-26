# TariffIQ in HubSpot: one field set (gem_tariff_*), written by the Hub

Only the existing `gem_tariff_*` fields are used. No `tariffiq_*` fields, no second mapping, no field names changed.

## 1. Skip-empty rule (all assessments)

**What happens today:** the HubSpot update sends `null` as a real value, so HubSpot clears the field. Missing values are only dropped when they are `undefined`.
- **TariffIQ:** every detail field, PDF link and dimension is `null` when missing. Score can be `null` too. An empty dimension map clears all 8 dimension fields.
- **GTMIQ, SalesIQ, ProductIQ, AITransformIQ (shared builder):** same risk. Segment, industry, top priorities, status, resume token, PDF link and every dimension are `null` when missing.
- **UXIQ (and the retired TechServicesIQ):** dimensions already skip empty values, but score and tier can still be `null`.

**Fix:** one shared `dropEmpty()` step runs on each assessment's output inside `buildContactProperties`. It removes values that are `null`, `undefined`, `""`, empty arrays, or a number that isn't valid. It's applied once in one place, so every current and future assessment is covered. Field names and the values that do get sent are unchanged.

Out of scope: the shared `gem_*` summary fields, as you instructed. Note that `gem_composite_tier` and `gem_next_assessment` can deliberately send `""` today, which clears them. They're left exactly as they are.

## 2. Trial gate for links

The TariffIQ link fields `gem_tariff_pdf_report`, `gem_tariff_pdf_recommendations` and `gem_tariff_pdf_answers` are left out when:
- the result's entitlement is `trial` (already stored on each submission as `metadata.entitlement`), or
- the report is locked for the submission being sent (the same `report_locked` value already sent as `gem_report_locked`).

Scores, tier, detail and dimensions still go. Because the fields are left out rather than blanked, a link from an earlier paid result stays in HubSpot. The same gate applies to the shared builder's `gem_<iq>_pdf_report` for consistency. That's a one-line rule in the same place, with no name changes.

## 3. Which links the link fields read

Recommended: **prefer the new `metadata` links and fall back to `detail.pdfUrls`**, so older results keep working:
- `gem_tariff_pdf_report` comes from `metadata.report_url`, else `detail.pdfUrls.report`.
- `gem_tariff_pdf_recommendations` comes from `metadata.recommendation_report_url`, else `detail.pdfUrls.recommendations`.
- `gem_tariff_pdf_answers` comes from `metadata.answers_document_url`, else `detail.pdfUrls.answers`.

**Results link:** no existing `gem_tariff_*` field covers `metadata.results_url`. `gem_report_url` is the Hub's own report page, which is a different link that workflows already use, so I won't reuse it. **Not sent** unless you approve a new property.
- Listed for approval only: `gem_tariff_results_url` (text, "GEM TariffIQ Results Link"). It would be created through the existing Admin "set up HubSpot fields" button, not by me directly. If you say no, the results link simply isn't sent.

To make this work, each submission's stored `metadata` (and entitlement) is passed into the mapping step. Today the mapping only sees detail and dimensions.

## 4. Tests (`tests/hubspot-tariffiq-mapping.test.ts`)

- **Full paid payload:** exact `gem_tariff_*` values, with links taken from `metadata`, and no `null` or `""` anywhere.
- **Empty dimensions `{}`:** none of the 8 `gem_tariff_*` dimension fields are present, and the other fields are still present.
- **Trial:** no `gem_tariff_pdf_*` fields, and score, tier, detail and dimensions are present. Locked-report case: same result.
- **Missing detail:** no detail-derived fields, and no nulls.
- **Older result with only `detail.pdfUrls`:** links fall back correctly.
- **One shared-builder case (e.g. GTMIQ) with missing detail:** no nulls.
- **Unchanged parts:** `gem_*` fields are unchanged and there are no `hs_analytics_source*` fields.

## 5. Optional: retry counts on the admin status card

Admin → Control status card adds "HubSpot retries: N pending, N failed permanently", read from the existing retry queue. Retries already happen automatically, and each failure is already shown on the submission. This only adds the totals.

## Files touched

- `src/lib/hub/assessments/index.ts`: `dropEmpty()` on each assessment's output, plus the trial or locked link gate.
- `src/lib/hub/assessments/types.ts`: optional `metadata` and `entitlement` on the mapping input.
- `src/lib/hub/assessments/tariffiq.ts`: the 3 PDF fields prefer `metadata` links, and the `_results_url` field is added only if approved.
- `src/lib/hub/assessments/readiness-family.ts`: nothing, unless approved (the gate lives in `index.ts`).
- `src/routes/api/public/submissions/submit.ts`: pass `metadata` and `entitlement` for history and current, and pass `report_locked` into the gate.
- `src/lib/hub/admin/legacy-submissions.server.ts`: pass the same values when re-syncing older results.
- `src/lib/hub/admin/status.server.ts` and its admin card: retry counts (optional, item 5).
- `tests/hubspot-tariffiq-mapping.test.ts` (new).
- `src/lib/hub/AGENTS.md`: a one-line rule that HubSpot mapping never sends empty values and that trial or locked results never send links.
- `PLAYBOOK.md`: note that TariffIQ's HubSpot fields are owned by the Hub.

These are inside the protected Hub paths. This request explicitly targets that area.

## Field-map refactor

Not done. Replacing the per-assessment mapping code would touch every assessment for no behaviour gain. The current structure stays.

## Conflicts and open points

1. **HubSpot field check not done.** Both the linked HubSpot connection ("refresh token expired") and my read-only tools failed to authenticate, so I haven't confirmed the `gem_tariff_*` fields exist or what type they are. Unknown fields are already dropped automatically and recorded on the submission, so nothing breaks. The first build step is a read-only check from the running Hub, and I'll report the result.
2. **Dropdown values.** `gem_tariff_role` and `gem_tariff_import_spend` are dropdowns. If TariffIQ sends a value outside their options, HubSpot rejects the whole update, and it's retried until it fails permanently. This already happens today and isn't changed here. I'll flag it if the check shows a mismatch.
3. **Separator.** `gem_tariff_top_priorities` keeps its current "; " separator, and field contents aren't changed.

Not touched: HubSpot fields (except the optional one listed above), workflows, emails, migrations, Stripe, IQ projects and the manifest.
