# Consulting-grade reports: single assessment + combined GEM.IQ

Goal: both reports read like an executive consulting deliverable (McKinsey/BCG narrative + Gartner maturity positioning), delivered as a polished web page and a branded PDF.

## 1. One report structure for both

1. **Cover** — GEM logo, company, assessment (or "GEM.IQ Business Health"), date, report ID.
2. **Executive summary** — 3 headline findings, the overall score and stage, one "so what" sentence, top 3 priorities.
3. **Maturity position** — five-stage ladder with "you are here" and the next stage's requirements.
4. **Peer benchmark** — your score vs peer median and top quartile, by industry and company size.
5. **Dimension deep dive** — radar chart (you vs peers), heat map of strengths and gaps, one insight per dimension.
6. **Key findings** — strengths to build on, critical gaps, risks if nothing changes.
7. **Action roadmap** — 30/60/90-day plan; each action has priority, effort, impact and owner role, plus an impact/effort chart.
8. **Methodology & evidence** — how the score is built, frameworks used, "why we ask this", sample size behind benchmarks.
9. **Next steps** — Talk to GEM, plus (combined report) which assessment to take next and why.

The combined report adds: score per assessment side by side, cross-assessment insights (e.g. strong product, weak go-to-market), and "X of 6 complete" with locked tiles to drive upgrades.

Trial/locked users keep seeing the score and stage only; the rest stays blurred with an unlock button, using the existing lock rules.

## 2. Peer benchmarks

- Built from real Hub results, grouped by industry and company size.
- Shown only when a group has at least 10 results; otherwise we fall back to all companies, and below that we show "Benchmark building — based on GEM reference values" with starting values you set in Admin.
- Honest note: there is no real peer data yet (reports were reset), so early reports will show the reference values.

## 3. Writing the report

- AI writes the executive summary, findings, insights and roadmap once per result from the scores, published content, tier recommendations and methodology; text from the assessment itself always wins.
- Saved once; only Admin "Regenerate" rewrites it (unchanged rule).

## 4. Branded PDF

- A dedicated print layout: cover page, page numbers, headers/footers, page breaks per section, charts kept sharp.
- "Download PDF" uses the browser's save-as-PDF on that layout (no extra services).

## 5. Admin

- Admin → Reports → Report settings gains: section toggles for the new sections, benchmark minimum group size, reference benchmark values per assessment, roadmap length.
- Preview any report as the customer sees it (existing Open button).

## Order

1. Shared report layout + charts + PDF layout (single report).
2. AI-written executive summary, findings and roadmap.
3. Benchmarks (with reference values in Admin).
4. Combined GEM.IQ report on the same layout.

## Technical details

- Touches protected Hub areas (`src/lib/hub/report-control.server.ts`, migrations) — needs your OK.
- `report_content` JSON grows: `executive_summary`, `findings`, `dimension_insights`, `roadmap[{horizon,action,priority,effort,impact,owner}]`, `cross_insights` (combined).
- New `SECTION_KEYS`: cover, executive_summary, maturity, benchmark, roadmap, methodology (in `src/lib/report-settings.ts`); existing keys kept so stored settings still load.
- Benchmarks: server function aggregates latest submission per email by assessment, industry and size from `profiles`; settings in `hub_report_settings` (min group size, reference values).
- Combined report route `/report/combined` reusing the same section components; data from `dashboard.server.ts` composite.
- Charts: existing `RadarChart`, plus new SVG maturity ladder, heat map and impact/effort chart; `@media print` stylesheet with `@page` rules.
- Manifest `report` block gets the new section keys (additive, no version bump); PLAYBOOK, AGENTS.md, llms.txt updated.
