<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## GEM.IQ — agent notes

[`PLAYBOOK.md`](./PLAYBOOK.md) is the authority. If anything here or in the code
disagrees with it, the Playbook wins — fix the code or update the Playbook, don't
leave them divergent.

### Catalog change checklist

Adding, retiring, renaming, or re-tracking an IQ means changing all of these in the
same pass:

1. `src/lib/iq-catalog.ts` — product entry, `DISPLAY_ORDER`, track.
2. `src/lib/hub/manifest.json` — `assessments` entry (+ `track`), bump `version` and
   `updated_at`.
3. `src/lib/hub/sdk.ts` — types if the manifest shape changed, then re-run
   `node scripts/mirror-sdk.mjs`. Never hand-edit `packages/hub-sdk/sdk.ts`.
4. `public/llms.txt` — the file LLMs read; goes stale fastest.
5. `src/routes/sitemap[.]xml.ts` — product paths.
6. `PLAYBOOK.md` — §1 table and the version header.

Retiring an IQ: add the key to `RETIRED_KEYS` in
`src/lib/hub/assessments/index.ts` and consume `LIVE_REGISTRY`. Do not hand-filter
at call sites. Keep the spec in `REGISTRY` so historical submissions still map.

### Known duplicate

`src/routes/sitemap[.]xml.ts` hardcodes all six product paths instead of deriving
them from `IQ_PRODUCTS`. Correct today, but it is another place the catalog is
restated by hand — a candidate for derivation on a future pass.
