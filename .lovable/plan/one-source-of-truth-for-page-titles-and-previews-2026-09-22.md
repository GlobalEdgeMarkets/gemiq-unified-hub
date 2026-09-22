# One source of truth for page titles and previews

Today the same brand sentence is typed out six times at the site level, and each page writes its own title, description and social-card tags by hand. This consolidates all of it into one module without changing what any page shows today.

## What gets built

A new file `src/lib/seo.ts` holding:

- Brand constants: brand name (`GEM.IQ`), parent company (`GlobalEdgeMarkets`), the site origin (`https://gemiq.globaledgemarkets.com`), the default site description, and the share image URL as a single exported constant (same URL as today, so swapping it later is one line).
- One `buildHead()` helper returning the exact `{ meta, links }` shape TanStack Start expects.

`buildHead()` takes: `title`, `description`, optional `path`, and optional overrides for `ogTitle`, `ogDescription`, `twitterTitle`, `twitterDescription`, `ogType`, `twitterCard`, `robots`, `image`, and `canonical: false`. When an override is absent, the social tags derive from `title` and `description`, so no sentence is written twice. When `path` is given it produces `og:url` and a canonical link; leaf pages only.

The overrides exist solely to preserve today's output byte-for-byte. Several pages deliberately use a different social headline than their page title, and that stays true.

## Files that change

1. `src/lib/seo.ts` — new.
2. `src/routes/__root.tsx` — sitewide defaults through the helper (charset, viewport, author, stylesheet and font links stay as-is).
3. `src/routes/index.tsx` — head only; the two structured-data blocks stay untouched.
4. `src/routes/auth.tsx`
5. `src/routes/docs.tsx`
6. `src/routes/docs_.market-entry-maturity-frameworks.tsx` — head only; its Article structured data stays untouched.
7. `src/routes/dashboard.tsx`
8. `src/routes/onboard.tsx`
9. `src/routes/admin.tsx`
10. `src/components/IQLanding.tsx` — `iqHead()` becomes a thin call into `buildHead()`; the six product routes themselves are not edited.

Nothing else is touched: no styling, no layout, no visible page text, no structured data.

## Inconsistencies found — judgment calls to confirm

These are real differences between pages today. Default position: **preserve each one exactly**, since the constraint is a refactor.

- **Canonical and og:url exist on only three surfaces** — the homepage, the market-entry article, and the six product pages (canonical only, no og:url). Auth, docs, dashboard, onboard and admin have neither. Preserving means those five stay without a canonical. Flagging because adding them would be an SEO improvement, but it is a behaviour change, so I have left it out unless you say otherwise.
- **Product pages have a canonical but no og:url** — asymmetric. Preserved as-is.
- **Social headline differs from page title on three routes**: homepage title is "GEM.IQ by GlobalEdgeMarkets — Executive Readiness Diagnostics" while og:title is "GEM.IQ Hub — A diagnostic, not a single score"; auth title is "Sign in — GEM.IQ Hub" versus og:title "GEM.IQ Hub — Sign in"; docs title carries "(Trial + Submit)" and og:title does not. All three preserved via overrides.
- **Twitter tags are uneven**: root, market-entry and product pages use `summary_large_image`; dashboard, docs, onboard and admin use `summary`; homepage and auth emit no twitter tags at all. Preserved exactly — the homepage and auth will still emit none.
- **Share image is only on the root** — og:image and twitter:image appear nowhere else. Preserved: the constant is defined once and applied only at the root, exactly as today.
- **Auth and dashboard have no twitter:description; docs and onboard shorten theirs** relative to og:description. Preserved via overrides.
- **Robots differs**: dashboard is `noindex`, admin is `noindex, nofollow`. Both preserved verbatim.
- **Docs and auth build their description from live catalog values** (assessment count, IQ name list, trial length). Those expressions stay in their own files and are passed into the helper — the helper never owns page copy.

## Cannot be made byte-identical

- **Tag ordering within the meta array may shift.** The helper emits a fixed order (title, description, og:*, twitter:*, robots); today's routes list them in slightly different orders. The rendered tags and their contents are identical; only their order in the document head can differ. This has no effect on any crawler or preview.
- Everything else — every title, description, canonical, og and twitter value on every page — comes out character-for-character as it is today, including the already-updated homepage title.

## Verification

After the refactor I will diff the rendered head of each of the eleven surfaces against the current values and confirm the build is clean before reporting.
