# Plan: customer report links in HubSpot and the "report ready" email

Goal: the report link a customer gets from HubSpot emails and from Admin's Resend is the same report their dashboard opens. That link comes from the shared rule in `src/lib/customer-report.ts`. No new HubSpot fields, no renames, same gating.

Note: this touches parts of the Hub we normally leave alone (`src/lib/hub/**`, `src/routes/api/**`). Approving this plan counts as the go-ahead for the files listed below and nothing else.

## a. Every place gem_report_url is set, and what changes

| Place | Today | Change |
|---|---|---|
| First submit (`submit.ts`, the HubSpot write) | Hub `/report/<id>` | Use the customer-report rule (report mode for that assessment plus the result's stored link) |
| Retry queue, rebuilt from the stored result (`submission-properties.server.ts`, `rebuildForSubmission`) | Hub `/report/<id>` | Same rule, so retries send the new link |
| Retry queue, old stored-payload fallback (`cleanStoredProperties`) | Replays whatever link was stored | No change. It's only used when the result can't be rebuilt. Gating stays. |
| Upgrade / unlock (Stripe conversion, Admin Unlock) | **Doesn't write HubSpot at all** | No change in this item. Flagged below. |
| Older-results import (`legacy-submissions.server.ts`) | Doesn't set gem_report_url | No change |
| Bootstrap (`hubspot-bootstrap.server.ts`) | Only defines the field | No change |
| Reset (`reset-reports.server.ts`) | Clears the field | No change |
| Submit reply to the IQ (`report_url` in the response, history list) | Hub `/report/<id>` | **No change.** IQs in "hub" mode depend on it, and it isn't a customer email. |
| e2e test check "HubSpot: report link" (`e2e.server.ts`) | Expects the link to contain the Hub result id | Expect the link to equal the customer-report rule's answer for that result. The "Report link and lock" detail line shows the same link. |

Gating stays exactly as it is. The link is removed whenever the result is locked **or** the entitlement is "trial". That second part means a trial result an admin has unlocked still gets no link in HubSpot. That's today's behaviour, and this plan keeps it.

## b. Existing HubSpot contacts

This count comes from the Hub's own records only. HubSpot wasn't called.
- 10 contacts have a HubSpot record. For each person I looked at their latest result:
  - **1 real contact** (GTMIQ, paid subscription, unlocked) will be holding a Hub `/report/<id>` link. The rule would replace it with that result's GTMIQ report link.
  - **6 test addresses** (`+gemtest-`) are unlocked and not trial, so they also hold a Hub link.
  - **3 trial contacts** shouldn't hold any link from their latest result.
- Caveat: an older paid result can leave a Hub link behind, because a later trial result never blanks the field. Only HubSpot itself can confirm that. I can't count it from the Hub side.

**Recommendation:** fix the 1 real contact through the existing retry/rebuild path by queueing one job for that result. That's 1 HubSpot write. Leave the 6 test addresses alone: the next quick-test run overwrites them. Nothing is written until Alex approves that one job separately after publishing.

## c. What a customer sees when clicking the link in a fresh browser

- **ProductIQ:** the link opens ProductIQ's own report page for that result. It asks the Hub's status check with no sign-in. Because links are only ever written for unlocked, non-trial results, the status check should say unlocked and the full report shows. If an admin re-locks the result later, the old link in HubSpot stays (see "upgrade / unlock" above), and ProductIQ should then show its locked box.
- **GTMIQ:** stored links look like `gtmiq.../report/<its own id>`. From the Hub side I can't tell whether that page needs a sign-in or checks the Hub's status. **Unknown, please check.**
- **SalesIQ, AITransformIQ, UXIQ:** none of their results store a report link, so the rule falls back to the Hub report page. Customers see the same page as today.
- **TariffIQ:** see item e.

## d. Other emails the Hub sends that contain a report link

| Email | Who gets it | Link used |
|---|---|---|
| "Report ready" (Admin → Reports → Resend) | Customer | Hub `/report/<id>`. **Will change** to the customer report. |
| "New submission" notification (`submission-notification`) | GEM staff only | The link the IQ sent with the result (often a PDF), plus HubSpot record links. No change. |
| Sign-in emails (signup, magic link, recovery, invite, email change, reauthentication) | Customer | No report links |
| Retry worker | — | Sends no email. Only writes HubSpot. |

The follow-up emails themselves come from HubSpot workflows, which read gem_report_url (item a).

## e. TariffIQ

TariffIQ stores its **PDF** report link in the same place where other IQs store their report page link. Report mode is "app" for every assessment, so the rule returns:
- a paid TariffIQ result with metadata: the **PDF link**
- a trial result, or an older one without metadata: the Hub report page

The dashboard already does this today. A PDF is a fixed file with no lock check, but links are only written for unlocked paid results, so nothing locked leaks.
**Recommendation:** accept this until TariffIQ sends a report page link. The alternative is to ignore `.pdf` links in the rule and fall back to the Hub page. That would also change what the dashboard shows, so it needs Alex's call.

## f. Files, tests, manifest, how to check

Files:
- `src/routes/api/public/submissions/submit.ts`: the workflow link on the HubSpot write only
- `src/lib/hub/submission-properties.server.ts`: the link in `rebuildForSubmission`
- `src/lib/hub/report-control.server.ts`: Resend uses the customer report
- `src/lib/hub/e2e/e2e.server.ts`: the report-link check
- a small helper so all of the above read report mode the same way: `getAllSettings` plus `mergeSettings`, then `customerReportUrl`
- `src/lib/hub/AGENTS.md`: one line

Tests (new `tests/customer-report-links.test.ts`):
- app mode with a stored link gives the IQ link in gem_report_url
- app mode with no stored link gives the Hub link
- hub mode gives the Hub link
- trial gets no gem_report_url, even when an admin has unlocked it
- locked gets no gem_report_url
- the retry rebuild gives the same link as submit

Manifest: **no version change.** The field and the submit reply stay the same.

Not done in this item: writing to HubSpot when an admin unlocks or re-locks a result, or when a trial converts. Today gem_report_url and gem_report_locked don't update when that happens. Worth a separate item.

**How Alex checks it after publishing (one test contact):**
1. With a paid test account, complete ProductIQ.
2. In HubSpot, open that contact. "GEM Report Link" should start with `https://productiq.globaledgemarkets.com/report/` and match the dashboard's "View report" link.
3. Open the link in a private window. ProductIQ's report should show.
4. In Admin → Reports, press Resend for that result. The email link should be the same.
5. Run Admin's quick tests. "HubSpot: report link" should pass.
