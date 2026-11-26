# Results presentation inventory (report only, no changes)

Sources checked: `src/routes/dashboard.tsx`, `src/lib/dashboard.server.ts`, `src/routes/report.$id.tsx`, `src/lib/hub/report-control.server.ts`, `src/lib/report-settings.ts`, `src/components/report/ReportParts.tsx`, `src/components/admin/ReportsPanel.tsx`, `src/lib/hub/dimensions.ts`, plus live `hub_report_settings` and `submissions` rows (26 Nov 2026).

## 1. Dashboard (/dashboard), top to bottom

| # | Block | Trial / locked result | Paid result |
|---|---|---|---|
| 1 | Header: "<First>'s IQ dashboard", company, email, "IQs completed", "Average score" | Same | Same |
| 2 | Plan banner | "7-day trial active until <date> · X/Y trial assessment used" | "Plan status: <status> · renews <date>" |
| 3 | Composite GEM.IQ card (only if a composite score exists): ring, tier chip, "N of 6 complete", "Open your combined report" + "How this is scored", score chips per IQ | Same block. The combined report page itself is locked for trialing users | Same |
| 3a | "Complete your picture": not-yet-taken IQs, one marked "Suggested next" | Same | Same |
| 3b | "Cross-IQ strengths" (top 5) / "Cross-IQ gaps" (bottom 5) | Same | Same |
| 4 | "Completed assessments": one card per IQ (latest result) with ring, tier chip, date, attempts, "Strongest / Biggest gap", 4 dimension bars | Score, tier, strongest/gap and dimension bars **are still shown**. "View report" is hidden. Text: "Trial result — the full report unlocks when your plan starts." There is no unlock button | "View report" shown (see below) |
| 5 | "Recommended next": every live IQ not yet taken, with a reason and "Start <IQ>" | Same | Same |

- **"View report"** goes to the Hub `/report/<id>` when mode = hub. When mode = app it goes to the app's `metadata.report_url`, and falls back to the Hub report if that is missing.
- **"Show all N dimensions"** only switches the card on the page between 4 bars and all bars. It isn't locked for trial results.
- **"Open <IQ>"** opens the assessment's homepage (`iqUrl`) in a new tab. It doesn't deep-link to the result or pass a session.
- **What decides locked:** `isReportLocked`. An admin override wins. Otherwise the result is locked when `metadata.entitlement` is `trial` or `unpaid` and there is no `active` subscription.
- The dashboard ignores the Admin "trial visibility" setting.

## 2. Hub report page (/report/<id>)

**Fixed parts:**
- Admin-preview banner (admins only)
- Buttons: "Download PDF", "Combined GEM.IQ report", "Back to dashboard"
- Cover with logo, "<IQ> · Maturity assessment", title (from the title pattern), "Prepared for", score, tier pill, date, reference `GEM-<KEY>-<id>` and "Confidential"
- Intro text
- Numbered sections (enabled ones, in Admin order)
- Disclaimer

**Default section order:** Executive summary, (Summary, off by default), Score & tier, Maturity position, Peer benchmark, Dimension breakdown, Strengths, Gaps, Recommendations, Action roadmap, Next steps, Methodology & evidence, Talk to GEM.

The live global row stores only 8 sections. The 5 newer ones (executive_summary, maturity, benchmark, roadmap, methodology) are added automatically at their default positions and switched on. Summary is stored as **on**.

| Section | (a) Trial / locked | (b) Paid / unlocked |
|---|---|---|
| Score & tier | Shown | Shown (+ "Higher than X% of peers" when a percentile exists) |
| Maturity position | Shown when trial access is `score_tier` (the live setting) or higher | Shown |
| Dimension breakdown | Shown only when trial access is `score_tier_dimensions`. Under `score` the dimension data is emptied | Radar chart (3+ dimensions), heat map with peer delta and AI insight |
| Peer benchmark | Blurred "Unlock the full report". Data is sent as a teaser with no per-dimension values | Benchmark bar plus wording on where the figures come from |
| All other content sections | Blurred "Unlocks with your plan." with a button to `/auth?mode=signup&plan=complete`. No text is sent or generated | Shown |
| Talk to GEM | Always shown | Shown |

- **Locked vs unlocked:** the same `isReportLocked` rule as the dashboard.
- **Hidden reports:** a hidden report returns "Report not found" to its owner.
- **Owner check:** user ID or matching email.

## 3. Hub-built reports (mode = "hub")

| Part | Content comes from |
|---|---|
| Score, tier | Submission `score`. The tier is the submission's `tier` (matched by key to Admin tiers), otherwise worked out from the score using the Admin tiers |
| Dimensions | Submission `dimensions` (values of 10 or less are rescaled as 0–9 to 0–100). Labels are made from the key, not the registry |
| Executive summary, dimension insights, risks, roadmap | AI only (written once and stored in `report_content`) |
| Summary, strengths, gaps, recommendations, next steps | App-sent `metadata.recommendations` first, then AI fills whatever is still empty |
| AI inputs | Score, dimensions, benchmark, published Hub content `tier_recommendations` and methodology, Admin `roadmap_items` |
| Benchmark | `computeBenchmark`: real peers (same industry) once the group reaches the minimum size, else Admin reference values |
| Methodology | Hub methodology + per-IQ published content (`methodology`, section `rationale`) |
| Wording, closing, disclaimer | Admin Report settings `copy` |

- **PDF:** none is stored. "Download PDF" is the browser's print dialog, using print styles.
- **Missing compared with the apps' own reports:**
  - The submission's `detail` (in `metadata.detail`) is never read.
  - No assessment-specific numbers or text.
  - No answer-level view (answers or answer_labels).
  - No app PDFs or links.
  - No registry dimension labels.
  - No per-dimension tier.
  - No industry benchmark from the app.

## 4. Admin → Reports controls

| Control | Scope | Used by |
|---|---|---|
| Sections: on/off and order | Global + per-IQ override | Hub report only |
| Trial access (score / score+tier / score+tier+dimensions) | Both | Hub report. Apps expected to honour (published via manifest `report.apps[key]`) |
| Who builds the report (mode app/hub) | Both | Dashboard "View report" target. Apps are expected to link to the Hub's `report_url` when hub |
| Peer benchmarks: smallest real group + median/top per IQ | Both (reference values are per IQ) | Hub report only |
| Action roadmap: number of actions (3–12) | Both | Hub report AI only |
| Wording: title pattern, intro, closing message/CTA/URL, disclaimer | Both | Hub report. Apps expected to honour |
| Tiers: name, from-score, colour | Both | Hub report. Apps expected to honour. **Not** the dashboard |
| All reports list: unlock / relock / clear / hide / unhide / regenerate / resend | Per submission | Hub report + dashboard lock |
| Reset all reports | Global | Hub results + app purge |

- **Takes effect only when mode = hub (or when the Hub report is opened anyway):** sections, benchmark, roadmap and the Hub's own rendering.
- **Expected from the apps:** trial access, wording, tiers and mode. Whether each app actually honours them was not checked.

## 5. Current mode and overrides per assessment

The only stored row is **global**: mode `app`, trial access `score_tier`, 8 stored sections, default tiers and copy.

**No per-assessment overrides exist.** All six (GTMIQ, SalesIQ, ProductIQ, AITransformIQ, UXIQ, TariffIQ) are mode **app**.

Live data has 4 submissions in total (2 GTMIQ, 2 TariffIQ). None has `report_content` or `metadata.recommendations`.

## 6. Assessment-specific gaps and data already stored

- **Cannot show today:** TariffIQ savings range, import spend, top priorities and primary concern. GTMIQ segment, traction probability and time to traction. UXIQ industry benchmark. Any app-computed metric, plus the apps' report/PDF links (other than `report_url`).
- **Stored per submission that could feed an "insights" section:**
  - `metadata.detail`:
    - TariffIQ: role, industry, importSpend, savingsLow/High, topPriorities, primaryConcern, dimensionScores
    - GTMIQ: segment, answer_labels
  - `answers`
  - `metadata` company/name/entitlement/report_url
  - `dimensions`
  - `score_check`
  - `content_version`
- GTMIQ traction metrics and UXIQ benchmarks are not in the stored rows I checked, and other IQs have no stored rows today.

## 7. Tiers: names, cut-points, colours

| Place | Names / cut-points | Colours | From Admin? |
|---|---|---|---|
| Dashboard result cards | Submission tier, else hardcoded `tierFromScore` 0/40/55/70/85 | Hardcoded CSS classes per key | No |
| Dashboard composite chip | Composite settings stages (default 0/30/50/70/85) | Same hardcoded classes | Composite settings, not Report tiers |
| Report page cover, Score & tier, Maturity ladder | Admin tiers (live: Reactive 0, Developing 40, Defined 55, Advanced 70, Optimized 85). The submission's own tier wins if it matches a key | Admin colours (#E5484D, #F5A524, #2C365B, #2D1594, #05CFAB) | Yes, except the app-sent tier wins over the score |
| Heat map tiles | Hardcoded 40/55/70 bands | Theme tokens | No |
| Admin "All reports" tier filter | Default tiers | — | No (defaults) |

## 8. Dashboard issues (noted, not fixed)

- **Same dimension under strengths and gaps:** strengths are the top 5 and gaps the bottom 5 of the same list. With 9 or fewer dimensions they overlap (1 IQ with 8 TariffIQ keys means 2 appear in both).
- **"Fta", "Hts", "Coo", "Supply Chain", "Newmarket" labels:** the dashboard and Hub report make labels from the key with `prettify`, not from registry or content titles.
- **"Cross-IQ" lists with one IQ:** the headings are always "Cross-IQ strengths/gaps", and the lists show whenever any dimension exists, even when only one assessment is complete.
- **Also seen:**
  - The 0–9 rescale rule treats any 0–100 dimension of 10 or less as 0–9 (for example 9 becomes 100).
  - Trial cards still show full dimension bars no matter what trial access says.
