## What these documents describe

Five docs, one storyline: ReadinessIQ becomes four separate products (GTM IQ, SalesIQ, ProductIQ, AI TransformIQ), the Hub becomes the single control plane for identity, billing, submissions, HubSpot and the composite report, and GitHub becomes the distribution channel that keeps every IQ in sync.

Ground truth is `09_DEPLOYED_STATE.md` — it overrides the older docs. Hub side is already done: 8 keys registered, 120 HubSpot properties, canonical five tiers, admin console live, read-only attribution bug fixed, retry queue drained.

## Verified state (checked against the live repo, not the docs)

| Item | Doc says | Actual |
|---|---|---|
| GitHub repo | "may not resolve — BLOCKER" | Connected, public, `main`, raw URL returns 200 — **cleared** |
| `hub-init.mjs` trial | writes `trial: true` | Confirmed, line 121 |
| `hub-init.mjs` key | guesses from package.json | Confirmed, line 136 |
| `new-iq.mjs` tiers | 3-option enum | Confirmed, line 74 — would narrow live enums |
| Manifest | — | v1.0.1, correct repo, correct brand tokens |

## The one irreversible step

The legacy import writes rows keyed on `(email, assessment_key, submitted_at)`. A wrong score, wrong tier, or wrong key can only be fixed by creating duplicate rows. Everything before it is editable. That is why calibration gates it.

## Proposed order

**Step 1 — Tooling fixes (small, hub only)**
- Remove `trial: true` from the `hub-init.mjs` template; add the 14-day money-back line.
- Make `--key=` an explicit required argument; fail loudly if absent.
- Point `new-iq.mjs` at `CANONICAL_TIER_OPTIONS` from `tiers.ts` instead of its hardcoded three.
- Leave the `techservicesiq` anchor and spec file alone.

**Step 2 — Prompt 10: calibration + migration route**
- `adminCalibrateReadinessScores` — read-only, reads legacy rows via the ReadinessIQ service-role key, reports mean / derived score / derived tier / `report_url`, and probes for a stored total under `total`/`composite`/`overall`/`score`/`score100`. A stored total beats a derived one.
- `api/public/admin/migrate-readinessiq.ts` + its server function: remap `market→gtmiq`, `enterprise→salesiq`, `productization→productiq`, `ai→aitransformiq`, everything else `readinessiq`. Dry run by default; real run refused unless the calibration box is ticked.
- `create_users` option, default false — creates accounts without invites, since the hub has no SMTP.
- Two console cards: Calibration (with the tick that unlocks import) and Migrate (dry run first, then import).

Needs two secrets first: `READINESS_SUPABASE_URL`, `READINESS_SERVICE_ROLE_KEY`.

**Step 3 — Verify, then import**
Calibrate 25 rows, open two or three real ReadinessIQ reports, compare score *and* tier. If they disagree, stop and fix `deriveScore` before anything is written. Then dry run on one email, then unrestricted, then the real run in batches watching `skipped`.

**Step 4 — The split** (`gem-iq-base`, brand config seam, generate four, Stripe one-time $149 prices, DNS). Mostly outside this project; the hub work here is the composite report moving hub-side.

**Step 5 — GitHub as the central source**
The repo is live, so this becomes: keep `packages/hub-sdk` + `manifest.json` as the published contract, extend the `check-hub-sdk.yml` CI pattern to each IQ, and have every IQ pull the SDK on `prebuild`. Brand and pricing changes then propagate from one place within five minutes.

## Open items I cannot do from here

HubSpot workflow config, Stripe price creation in the dashboard, GoDaddy DNS, SMTP transport selection, and creating the four Lovable projects. I will flag each rather than improvise.

## Scope

Prompt 10 touches `api/public/admin/` and hub server functions — the named exception to the scope fence. It will not change `submissions/submit.ts`, `buildContactProperties`, the specs, `tiers.ts`, `upsertContactByEmail`, or the database schema.
