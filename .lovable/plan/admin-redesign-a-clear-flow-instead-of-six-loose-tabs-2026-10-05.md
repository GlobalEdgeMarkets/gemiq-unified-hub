# Admin redesign: a clear flow instead of six loose tabs

## The problem today
Six tabs in a row (Control, Content, Reports, Tests, Tracking, Users & data). Related actions sit far apart: "Set up HubSpot fields" is under Users, "Reset all reports" sits next to everyday report settings. Several buttons still print technical results, and there's no single place that tells you whether everything is OK.

## New structure
A left-hand menu, grouped by the order you actually work in. Each page opens with one sentence explaining what it's for.

```text
Overview            ← new home: is everything OK today?
ASSESSMENTS
  Health & settings   (health lights, shared settings, pause/notice)
  Questions & scoring (today's Content tab)
  Add an assessment   (onboarding steps)
RESULTS
  Reports             (all reports, report settings)
CUSTOMERS
  Find a person       (new: search an email → plan, results, actions)
QUALITY
  Tests
  Tracking (PostHog)
SETUP
  HubSpot & system    (HubSpot fields, registry status, legacy import)
  Danger zone         (Reset all reports, Delete user), shown in red
```

## What's new or better
1. **Overview page**, a one-screen answer to "is anything wrong?":
   - assessment health lights (green/amber/red), with one click to the problem
   - results this week and how many are trial vs paid
   - latest test result per assessment
   - score mismatches and HubSpot retry jobs waiting
   - quick buttons: Check all now, Run all quick tests
2. **Find a person** (Customers): type an email to see their account, plan or trial, every result with report links, and HubSpot status. Unlock a report, open it or delete the person from there. This replaces hunting through the submission browser.
3. **Danger zone**: Reset all reports and Delete user move to one red-bordered page, each still asking for confirmation.
4. **Plain-language results everywhere**: the remaining buttons that print technical results (registry status, legacy import, submission browser) get the same one-line ✓/✗ style as Delete user.
5. **Consistent look**: one card style, one status chip style (Passed / Needs attention / Failed), the same spacing, and a wider page so tables fit without sideways scrolling.
6. **Remembers where you were**: the page you're on is in the address, so refreshing or sharing a link opens the same page.
7. **Mobile**: on a phone, the menu collapses into a dropdown at the top.

## What doesn't change
Every existing button and setting keeps working exactly as now. This is reorganisation and presentation only: no change to assessments, HubSpot, billing or results.

## Technical details
- `src/routes/admin.tsx` becomes a shell with a sidebar; sections are selected via a `?section=` search param (validated with zod) instead of `Tabs`.
- New client components: `AdminOverview.tsx`, `PersonLookup.tsx`, `DangerZone.tsx` in `src/components/admin/`; existing panels are reused and regrouped (ResetCard moves out of ReportsPanel into DangerZone).
- Overview and Person lookup need two new admin-only read functions in `src/lib/admin.functions.ts` (`adminOverview`, `adminPersonLookup`), composed from existing server helpers (health, e2e runs, retry queue, score mismatches, submissions, subscriptions, HubSpot contact read). This is read-only.
- Shared `AdminCard`, `StatusChip` and `ResultList` primitives, using semantic tokens only.
- Scope fence: no edits under `src/lib/hub/**` or `api/**`. New read functions import existing helpers only.
