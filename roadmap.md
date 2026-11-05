# Roadmap — composite score, methodology, pricing

- [x] Combined score rule + Admin weights/stages page
- [x] Customer dashboard: weighted score, "X of 6 complete", locked tiles, next suggested
- [x] HubSpot fields: combined score, stage, next suggested assessment
- [x] Methodology: Hub-wide (Admin → Combined score) + per assessment (Questions & scoring) + public /methodology page
- [x] Content prompt updated to show methodology / "why we ask this"
- [x] Pricing Option B (Starter $179 / Growth $149 mo / Complete $249 mo or $2,490 yr) in billing + site

## TariffIQ fresh-user journey test
- [x] Prepare fresh-account preflight, manual purchase journey and evidence checklist
- [x] Create and validate safe recording/checkpoint scripts without changing app behavior
- [x] Deliver test kit; registration and payment performed by the tester

## Standalone IQ PostHog coverage
- [x] Verify ProductIQ, AITransformIQ and UXIQ tracking on their live domains: no customer PostHog ingestion observed
- [ ] Enable missing tracking in the three standalone projects — blocked: their checkouts are read-only from the Hub chat
- [ ] Confirm received pageviews — blocked until tracking is enabled and published in the standalone projects

## UXIQ launch address
- [x] Correct the Hub catalog, manifest, registry, and analytics audit to use the live UXIQ domain
- [x] Verify UXIQ links and sign-in context; leave publishing to the user

## Alejandro dashboard assessment visibility
- [x] Reproduce why the new-user dashboard shows only four assessments
- [x] Show every uncompleted live assessment, including ProductIQ and AITransformIQ, and verify as Alejandro

## UXIQ exact preview access
- [x] Allow only the named UXIQ preview hostname while preserving credentials and access checks
- [x] Verify subscription, profile and existing result reads (HTTP 200), signed-out profile denial (401), and regression tests; no publishing. Local preview intercepts OPTIONS, so preflight headers are covered by helper tests, not a live browser preflight.
