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
