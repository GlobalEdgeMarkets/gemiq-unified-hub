# Messaging — one place for brand wording across GEM properties

## What you get
A new **Brand → Messaging** page in Admin. Editors keep every headline, tagline, practice line, offer line and quote for globaledgemarkets.com, GEM.IQ and GlobalEdgeTalk there. Each property reads its live wording from a public link. Questions & Scoring already uses the same draft → preview → publish → version history routine, so it will feel familiar.

Nothing else changes in this step: assessments, scoring, pricing, Stripe, reports, HubSpot and the public Hub pages stay as they are.

## Screens (Admin → Brand → Messaging)
1. **Top bar:** the live version number, who published it and when. Draft status shows as "No draft", or "Draft v3 — 4 changes since live". Buttons: Save draft, Preview, Publish, Discard draft.
2. **Four tabs:** Shared · globaledgemarkets.com · GEM.IQ · GlobalEdgeTalk.
   - The Shared tab lists the shared items.
   - Each property tab shows that property's final set: its own items plus the Shared ones. Each item carries a small tag: "Shared", "Own" or "Overrides shared".
   - Items are listed in their set order. Filters: status (Approved / Draft / Needs input) and a search box.
3. **Item editor (one row per item):** key, label, value (several lines allowed), notes, status, order (move up/down) and an optional "related assessment" (one of the six GEM.IQ assessments).
   - If the value uses an "avoid" word, an amber note appears underneath. For example: *"diagnostic": use "assessment" instead. It reads as the traditional consulting model.* This is a warning only, so saving still works.
   - Buttons: Add item, Duplicate to property (to override a shared item), Delete.
4. **Preview:** pick a property and see exactly what its public link would return from the draft. This means **Approved items only**. Everything left out is listed separately as "Hidden — draft (n)" and "Hidden — needs input (n)".
5. **Wording rules:** a table of Use / Avoid / Why that you can add to and edit. It is saved together with the messaging set, so it is versioned with it.
6. **History:** every version with its number, note, who saved it and when, and a status (live / draft / archived). Each version has View and **Make this live again**.
7. **Publish hook:** a list of web addresses (for the WordPress cache later), each with an on/off switch. After a publish, the result shows in plain words, one line per address. A failed address never undoes the publish.

All results use the same plain-language ✓/✗ style as the rest of Admin.

## How publish and rollback work
They work exactly like Questions & Scoring:
- **Save draft** updates the single draft. If no draft exists, it creates a new one with the next version number.
- **Publish:** the current live version is archived and the draft becomes live with a timestamp and your name. The Hub then works out which properties changed (in what visitors actually see) and calls the publish hook addresses with that list.
- **Make this live again:** the Hub copies the old version into a new draft and publishes it as the next number. History is never rewritten.
- The starting content goes in as **version 1, Draft**. You review it and publish it yourself.
- **Approval comes first:** publishing doesn't make a Draft-status item visible. An item only appears on a site once it is marked **Approved** *and* that version is published.

## The public link
`GET /api/public/messaging?property=globaledgemarkets.com`. The property can be `globaledgemarkets.com`, `gemiq` or `globaledgetalk`.

- It returns only the live version, with Shared items plus the property's own items. Where both use the same key, the property's own item wins.
- **Only Approved items are included.** Draft and Needs input items are left out.
- Items come back in their set order, so sites can list practices in the right sequence.
- Cached for 5 minutes (stale-while-revalidate 10 min), with a version tag (ETag) so sites can check cheaply for changes (304 when unchanged).
- No sign-in is needed to read. CORS allows:
  - globaledgemarkets.com, www.globaledgemarkets.com and *.globaledgemarkets.com
  - globaledgetalk.live and www.globaledgetalk.live
  - the lovable.app preview and published addresses of GEM Hub Central and GlobalEdgeTalk
- If nothing is published yet, it answers 404 `{ "error": "not_published" }`. An unknown property answers 400.

Example response:
```json
{
  "property": "globaledgemarkets.com",
  "version": 1,
  "published_at": "2026-10-12T15:00:00Z",
  "items": [
    { "key": "brand.name", "label": "Brand name", "value": "GlobalEdgeMarkets (GEM)", "source": "shared", "order": 10 },
    { "key": "practice.1", "label": "Go-to-market & market expansion", "value": "Where to launch, how to enter and expand, and how to win the first customers and partners", "related": "gtmiq", "source": "shared", "order": 200 }
  ],
  "by_key": { "brand.name": "GlobalEdgeMarkets (GEM)", "practice.1": "Where to launch, how to enter and expand, and how to win the first customers and partners" },
  "vocabulary": [
    { "use": "assessment, GEM.IQ assessment", "avoid": ["diagnostic", "diagnostics"], "why": "reads as the traditional consulting model" }
  ]
}
```
The ordered list is for loops like practices; the key-to-value map is for single lookups. Status isn't returned, because every item in the response is Approved.

## Data model
Two new tables. Like the other `hub_*` tables, nobody can read or write them directly; all access goes through admin-checked server functions and the public link.

```text
hub_messaging_versions
  id uuid pk, version int, status text ('draft'|'published'|'archived'),
  body jsonb  -- { items: [{key, scope, label, value, notes, status, order, related?}],
              --   vocabulary: [{use, avoid[], why}] }
  note text, created_by text, created_at, published_at
  unique (version); partial unique: one row where status='draft', one where status='published'

hub_messaging_settings  (single row, id boolean pk default true)
  publish_hooks jsonb  -- [{url, enabled, label}]
  last_hook_results jsonb, updated_at, updated_by
```

- Row-level security is on for both. There are no policies for visitors or signed-in users, and only the server's own key gets access, matching `hub_report_settings` and `hub_iq_content`.
- Item `scope` is `shared | globaledgemarkets.com | gemiq | globaledgetalk`.
- `order` is a number set by the move up/down buttons, spaced in steps of 10. `related` is optional and must be a GEM.IQ assessment key.
- The set is checked before it is saved: keys look like `a.b_c`, each key appears once per scope, and values are at most 5,000 characters.

## Starting content (version 1, Draft)
This is your list as given, with these changes:
- **`hero.subhead`** (globaledgemarkets.com, Draft): "We help companies go to market and expand, transform with AI, productize and monetize, activate sales and revenue, and improve digital and AI experience, with industry-specific expert solutions such as tariffs. Every engagement starts with a GEM.IQ score and is measured by it."
- **Six new shared items, all Approved**, kept in this order. The label is the practice name and the value is the one-liner:

| Order | Key | Label | Value | Related |
|---|---|---|---|---|
| 1 | practice.1 | Go-to-market & market expansion | Where to launch, how to enter and expand, and how to win the first customers and partners | gtmiq |
| 2 | practice.2 | AI transformation | AI use cases, data foundation and governance tied to measurable ROI | aitransformiq |
| 3 | practice.3 | Productization & monetization | Turn services and platforms into products, with pricing models that scale | productiq |
| 4 | practice.4 | Sales & revenue activation | From ABM to ABX: sales and marketing on one plan and one set of metrics | salesiq |
| 5 | practice.5 | Digital & AI experience | Websites, apps and AI-powered journeys that convert | uxiq |
| 6 | specialist.example | Tariffs & supply chain (industry-specific expert solution) | Lower duty costs and protect margin across borders; more industry-specific solutions and assessments in development | tariffiq |

- The other items keep the order of your seed list, and the eight wording rules go in as given.

## Manifest and contracts
- **The Hub manifest stays as it is, and no version bump is needed.** The manifest and SDK describe the contract between the Hub and the IQ apps: assessments, pricing and report control. AGENTS.md requires a bump only when that catalog or contract changes. The messaging link is a separate brand feed, used mainly by WordPress and GlobalEdgeTalk.
- When GEM.IQ apps start reading messaging later, I'd add a pointer such as `deep_links.messaging` to the manifest and bump the minor version then.
- I'll add a short Messaging section to PLAYBOOK.md and one rule to AGENTS.md: brand wording lives in `hub_messaging_versions` and is served at `/api/public/messaging`, Approved items only.

## Risks and notes
- **Protected areas:** this touches `src/lib/hub/**`, `src/routes/api/public/**` and the database. Your request explicitly asks for the endpoint and tables, so I'm treating that as approval for these new files only. Existing Hub files are not edited.
- **Sites start nearly empty:** with Approved-only, publishing version 1 will show only the items already marked Approved. Most hero and offer lines will stay hidden until you approve them.
- **Placeholders:** values such as `[from $X]` are all marked Needs input, so they stay hidden.
- **Pricing can drift:** `plan.subscription` and `plan.single` restate prices that the manifest also holds. For now they are separate copies, and a pricing change means updating both. Later I could show a warning when they disagree.
- **Publish hook:** it sends `{ event: "messaging.published", version, properties_changed: [...] }` with a shared secret header (`x-hub-messaging-secret`, a new secret) so WordPress can verify it. Each call times out after 10 seconds and is never retried automatically.
- **Caching:** after a publish, sites can take up to about 5 minutes to show new wording, unless the hook clears their cache sooner.

## Technical details
- `src/lib/hub/messaging.server.ts`: listVersions, publishedSet, saveDraft, discardDraft, publishDraft (archive live version, publish draft, run hooks), rollbackTo, effectiveSet(property, body, { approvedOnly }), and a diff of what each property shows publicly.
- `src/lib/messaging.ts` (safe for browser code): Zod schemas, the merge rule, the order sort, and `findAvoidTerms(value, vocabulary)`, which matches whole words regardless of case. The editor and tests share it.
- `src/lib/admin.functions.ts`: new server functions using the existing `requireHubAdmin` check, each rejecting non-admins.
- `src/components/admin/MessagingPanel.tsx`, built from the shared parts in `ui.tsx`. `admin.tsx` gets a NAV entry under a new "Brand" group (`?section=messaging`).
- `src/routes/api/public/messaging.ts`: GET/OPTIONS with ETag and 304 responses, and its own CORS allowlist (the existing Hub CORS settings are not touched).
- Migration: create both tables, grant access to the server role only, turn on row-level security, add the singleton settings row. The starting content and wording rules are added afterwards as version 1, Draft.
- Tests in `tests/messaging.test.ts`:
  - the property's own item beats a shared one
  - the public set includes only Approved items, leaving out Draft and Needs input
  - practice.1–5 and specialist.example come back in order
  - the avoid-word check catches "diagnostics" and "10 minutes"
  - rollback creates a new version number
  - the CORS rule allows www.globaledgetalk.live and rejects an unlisted address
