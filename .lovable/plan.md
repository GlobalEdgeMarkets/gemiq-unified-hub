# Dimension ID registry + CRM rule (manifest 1.12.0)

Make the Hub the single source of truth for dimension IDs, check incoming submissions against it (report-only), surface results in Admin, warn in the content editor, and document that only the Hub writes to HubSpot. No migrations, no HubSpot/Stripe changes, no IQ project changes.

## Steps

1. **Manifest** — add `dimensions` { spine, by_assessment (exact keys as given; uxiq `[]`), rules } and `contracts.crm_rule`; bump `version` to 1.12.0 and `updated_at`. Add matching types to the Hub SDK and re-run the mirror script. No existing key renamed.
2. **Submit check (report-only)** — new `checkDimensionKeys(key, dimensions)` returns `{ dimension_keys_ok, missing, unknown, empty, registry_empty }`. Stored inside `score_check` under a nested `dimensions` object, merged with the existing score result. Submission is never rejected or altered.
3. **Admin → Control → Assessment health** — one line per assessment: "Dimension keys: OK / N unknown / N missing / empty", from each assessment's latest submission. UXIQ shows "no registry yet". TariffIQ expected "empty".
4. **Content editor** — inline warning under a section key not in `by_assessment[key]`. Never blocks Save/Publish.
5. **Composite/benchmarks** — benchmarks already group by key (OK). Dashboard roll-up is changed to group by key and only merge `spine` keys across assessments; non-spine keys stay per-assessment.
6. **Docs** — PLAYBOOK.md version header + dimensions/CRM note, `public/llms.txt`, AGENTS.md rule ("dimension keys come from manifest `dimensions`; never join on titles"), MCP manifest re-extract.
7. **Tests** — key check (ok / unknown / missing / empty / no registry), spine-only roll-up, manifest version and crm_rule present.

## Conflicts with current code

- **Dashboard roll-up joins on display labels.** `dashboard.server.ts` groups the combined profile by `d.label.toLowerCase()` (a prettified title) and merges *every* dimension across IQs, not just spine. Step 5 fixes this; combined profile cards will change (e.g. "Market" and "Sales Process" no longer appear as cross-IQ rows; only spine ones merge).
- **`score_check` is owned by the score check.** `checkScore` overwrites the whole field and skips entirely when no `content_version` is sent; the Admin "score mismatches" list filters on `score_check->>ok = false`. The dimension result must be nested (not top-level `ok`) and written by a merge, or it would hide/fake mismatches.
- **Rule vs. data on the dashboard.** Some IQs send 0–9 scales; unchanged, but noted.
- **Hub content section keys may not equal dimension keys.** Section keys in Hub content (e.g. starter `section_1`) aren't guaranteed to match what apps send; step 4 warnings may be noisy until content is imported. Not a blocker.
- **Scope fence.** Most files are under protected `src/lib/hub/**` and `src/routes/api/**`; this request names them explicitly, so I treat it as permission for exactly the files below.
- **TariffIQ keys** (`supplyChain`) are camelCase while others are kebab-case — kept as-is per "never rename".
- `roadmap.md` could not be updated in plan mode; it will be on approval.

## Files touched

- src/lib/hub/manifest.json
- src/lib/hub/sdk.ts → packages/hub-sdk/sdk.ts (via mirror script only)
- src/lib/hub/dimensions.ts (new, client-safe: registry read + `checkDimensionKeys`)
- src/lib/hub/content.server.ts (merge into `score_check`)
- src/routes/api/public/submissions/submit.ts (call the check after insert)
- src/lib/hub/app-control.server.ts and/or src/lib/admin.functions.ts (health data)
- src/components/admin/ControlPanels.tsx (health line)
- src/components/admin/ContentPanel.tsx (key warning)
- src/lib/dashboard.server.ts (key + spine roll-up)
- tests/dimensions.test.ts (new)
- PLAYBOOK.md, public/llms.txt, AGENTS.md, roadmap.md, .lovable/mcp/manifest.json (regenerated)
