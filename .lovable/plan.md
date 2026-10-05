# GEM.IQ composite score, methodology and pricing review

## 1. Combined GEM.IQ score and report
- New **GEM.IQ Business Health** page for each customer: one combined score built from the assessments they've completed, labelled "3 of 6 complete".
- Each assessment shows as a tile: taken (score, tier, date) or locked ("Add SalesIQ to complete your picture").
- Combined report: overall maturity tier, strongest and weakest areas across assessments, cross-assessment insights (e.g. strong product, weak go-to-market), and recommended next assessment.
- Admin → Questions & scoring gets a **Combined score** page: set how much each assessment counts, the combined tiers, and the minimum number of assessments before the overall tier shows.
- HubSpot gets new fields (combined score, assessments completed, next recommended assessment) so your workflows can send cross-sell and upgrade emails.

## 2. Methodology and "why we ask this"
- **General methodology** (edited once in the Hub): scoring approach, maturity model, data sources, how to read results. Shown on every report and on a public Methodology page.
- **Per assessment** (edited in Questions & scoring): methodology summary, research and frameworks it draws on, how it compares with other frameworks, plus a "Why we ask this" note on each section and question.
- The assessments show this through the existing Content prompt (one updated prompt per assessment).

## 3. Pricing options (for you to choose; nothing changes until you do)

Market reference: scorecard tools charge $0–50 per assessment; Gartner/Forrester-style diagnostics sit in $10k+ yearly memberships; consulting maturity reviews start at $15–50k.

**Option A: Keep plus bundle**
$179 single, add a **Full Picture** bundle of all six plus the combined report for about $590, and keep the $99/month plan.

**Option B: Three plans**
- Starter: $179, one assessment
- Growth: $149/month, any three assessments plus the combined report
- Complete: $249/month or $2,490/year, all six, combined report, quarterly retakes with progress tracking

**Option C: Subscription first**
The combined score and quarterly tracking become the main product at about $199/month or $1,990/year. A single assessment ($179) is the entry point, and its price counts toward the first month if the customer upgrades within 14 days.

Upgrade prompts in every option: after a single purchase (credit toward a plan), when the combined score has gaps, and at the quarterly retake.

## Order of work
1. You pick a pricing option (or mix).
2. Combined score plus Admin weights, and the HubSpot fields.
3. Methodology fields in the Hub, then the updated Content prompt for each assessment.
4. Pricing change in billing and on the site.

## Technical notes
- Composite rule defined once (next to `computeScore`) and restated in the manifest `contracts`; settings stored in a Hub table with Admin editing.
- Content schema gains optional `methodology`, `rationale` (section/question) and `references` fields — older assessments keep working.
- Pricing changes follow the catalog checklist (manifest, sdk mirror, llms.txt, PLAYBOOK).
