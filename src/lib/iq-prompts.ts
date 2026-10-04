// Prompts the Admin page hands out for pasting into IQ apps. Client-safe.
const HUB = "https://gemiq.globaledgemarkets.com";

export function syncPrompt(app: { key: string; name: string }, manifestVersion: string): string {
  return `Connect ${app.name} to GEM Hub Central's live settings (manifest ${manifestVersion}). The IQ key for this app is "${app.key}".

1. Read settings live from ${HUB}/api/public/manifest on app start and every 5 minutes (use If-None-Match with the returned etag). Never hardcode prices, trial rules, guarantee, wording, logos, colours, fonts or footer links — use the manifest values, and hide a whole sentence when its value is missing.
   - Pricing: pricing.one_time, pricing.plans, pricing.trial, pricing.guarantee.
   - Wording: pricing.copy.checkout_cta, pricing.copy.guarantee_line, pricing.copy.trial_line.
   - Branding: brand.logos, brand.colors, brand.fonts, brand.footer_links.
2. Notices and pause switch:
   - If control.global.notice is set, show it as a banner at the top of every page (info = mint, warning = amber, critical = red).
   - If control.apps["${app.key}"].notice is set, show it too.
   - If control.apps["${app.key}"].paused is true, replace every page except sign-in with a friendly "${app.name} is temporarily unavailable" screen that shows the notice text, and block new assessments from starting.
3. Add a protected status link: POST /api/public/hub-status (if this app can only add backend functions, use /functions/v1/hub-status instead and tell me the exact address).
   - Require header x-hub-purge-secret and compare it in constant time to the existing HUB_PURGE_SECRET secret. Wrong or missing → 401 with no details.
   - Respond 200 with JSON: { "manifest_version": "<version of the manifest this app last loaded>", "app_version": "<short build or date string>", "checks": { "sign_in": <bool>, "checkout_link": <bool>, "purge": <bool>, "posthog": <bool> } }.
   - Each check is a quick self-test: sign_in = the Hub session link responds; checkout_link = the Hub checkout address is configured; purge = the purge-user link exists; posthog = PostHog is configured to the shared project.
   - Never include user data, secrets or error details.
4. Keep the existing purge-user link, PostHog tracking and report locking exactly as they are.
5. When done, tell me the exact status link address.`;
}

export function onboardingPrompt(
  app: { key: string; name: string; site_url: string; track: string; description?: string | null },
  manifestVersion: string,
): string {
  return `Set up ${app.name} as a new GEM.IQ assessment connected to GEM Hub Central.
IQ key: "${app.key}". Site: ${app.site_url}. Track: ${app.track}.${app.description ? ` Purpose: ${app.description}` : ""}

Read GEM Hub Central's integration guide at ${HUB}/docs and the live manifest at ${HUB}/api/public/manifest (version ${manifestVersion} or newer). Use the Hub SDK from the manifest's hub.sdk_source.

1. Sign-in: use GEM Hub Central for accounts — no separate sign-up. Send users to the manifest's deep_links.login and read the session with the Hub SDK.
2. Pricing and checkout: never run your own Stripe checkout. Show prices, trial and guarantee from the manifest (pricing.*), and send buy and trial buttons to the manifest's deep_links. Hide a whole sentence when a value is missing.
3. Report locking: when a submit or past-result response has report_locked = true, show only the score and tier, plus an "Unlock the full report" button that goes to the Hub. Otherwise show the full report.
4. Results: submit finished assessments to the Hub with the SDK's submit call using assessment key "${app.key}".
5. Branding: use the manifest's brand fonts, colours, logos (navy+mint on light, white+mint on dark, never altered) and footer links.
6. Delete link: add POST /api/public/purge-user (or /functions/v1/purge-user if the app can only add backend functions). Require header x-hub-purge-secret, compared in constant time to the secret HUB_PURGE_SECRET (ask me for it through the secure secrets form — never generate a new one). Body { "email" }. Delete everything for that email, case-insensitively. Return 200 even if nothing is found, and never leak error details.
7. Status link, notices and pause switch: follow exactly these steps —
${syncPrompt(app, manifestVersion).split("\n").slice(2).join("\n")}
8. PostHog: connect the workspace's existing PostHog connection (the same project as GEM Hub Central). Identify signed-in users by email, and send these events: ${["signup_completed", "signin_completed", "assessment_started", "assessment_submitted", "results_submitted", "checkout_started", "consultation_clicked"].join(", ")}. Tracking must never block the app.
9. When finished, publish, then tell me the exact delete link and status link addresses.`;
}

export function reportPrompt(app: { key: string; name: string }, manifestVersion: string): string {
  return `Connect ${app.name}'s report to GEM Hub Central's live report settings (manifest ${manifestVersion}). The IQ key for this app is "${app.key}".

1. Read report settings from ${HUB}/api/public/manifest → report.apps["${app.key}"] (the same live settings you already load every 5 minutes). If report is null, keep the last copy you loaded.
2. If mode is "hub": don't render your own report. After submitting, send the user to the report_url returned by the Hub's submit response (also returned for each past result in /api/public/submissions/history). Your "View report" buttons open that link.
3. If mode is "app": render your report from these settings:
   - sections: show only enabled sections, in the given order (summary, score_tier, dimensions, strengths, gaps, recommendations, next_steps, talk_to_gem).
   - trial_access: when report_locked is true, show only score (score), score + tier (score_tier), or score + tier + dimensions (score_tier_dimensions); every other section shows "Unlocks when your plan starts" with an "Unlock the full report" button to the Hub.
   - copy: title_pattern ({assessment}, {company}, {name}), intro, disclaimer, closing_message, closing_cta, closing_url. Hide anything that is empty.
   - tiers: use these labels, score ranges (min) and colours for the tier badge.
4. With every submit, include the report text you write in a "recommendations" field: { summary, strengths[], gaps[], recommendations[], next_steps[] } (any subset). The Hub uses it in Hub-built reports and writes the missing parts itself.
5. Keep sign-in, checkout, the status link, purge-user link and PostHog exactly as they are. Add "report_mode": "<app or hub>" to the hub-status reply.
6. When done, publish and tell me which mode you're showing.`;
}

export function contentPrompt(app: { key: string; name: string }, manifestVersion: string): string {
  return `Let GEM Hub Central control ${app.name}'s questions, scoring weights and tiers (manifest ${manifestVersion}). The IQ key for this app is "${app.key}".

1. Content export (one-time import): add POST /api/public/hub-content-export next to your hub-status link, with the same x-hub-purge-secret check (wrong or missing secret → 401). It returns { "content": { intro, sections: [{ key, title, description, weight, questions: [{ key, text, help, weight, options: [{ key, label, points }] }] }], tiers: [{ key, label, min }], tier_recommendations: { <tierKey>: string[] } } } built from your CURRENT questions. points are 0–100 per option, weights are relative numbers (use 1 if you don't weight). Keep keys stable — they identify answers.
2. Load Hub content: on start and every 5 minutes, read ${HUB}/api/public/manifest → content["${app.key}"]. If it's a number, fetch ${HUB}/api/public/content/${app.key} (send If-None-Match with the last ETag) and render the assessment from its content: sections in order, each question with its options, plus intro. If it's null, the request fails, or the content is invalid, keep using your built-in questions.
3. Score with the Hub's rule exactly: question = chosen option's points; section = weighted average of answered questions (question.weight); overall = weighted average of answered sections (section.weight), rounded; tier = the highest tier whose min ≤ overall. Show tier labels and the tier_recommendations for the user's tier.
4. On submit, send content_version (the Hub version you used; omit when on built-in questions), answers as { questionKey: optionKey }, dimensions as { sectionKey: sectionScore }, score and tier. The Hub re-checks the score and flags mismatches.
5. Add "content_version" (the loaded Hub version, or null) to the hub-status reply.
6. A user who started before a new version was published finishes on the version they started with.
7. Keep sign-in, checkout, reports, purge-user and PostHog unchanged. Publish, then tell me the content export link.`;
}
