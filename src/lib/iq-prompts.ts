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

/** Stable markers the Checkly test uses. Kept here so the prompt and script never drift. */
export const TEST_MARKERS = {
  start: "start-assessment",
  question: "question",
  option: "answer-option",
  next: "next-question",
  submit: "submit-assessment",
  result: "result",
  firstName: "contact-first-name",
  lastName: "contact-last-name",
  company: "contact-company",
} as const;

export function testMarkersPrompt(app: { key: string; name: string }): string {
  const m = TEST_MARKERS;
  return `Add automated-test markers to ${app.name} (IQ key "${app.key}") so GEM Hub Central's scheduled end-to-end test can take the assessment like a person. Only add data-gem-test attributes — don't change any behaviour, wording or layout.

1. The button that starts the assessment: data-gem-test="${m.start}".
2. Each question's wrapper: data-gem-test="${m.question}". Every clickable answer inside it (radio, card, button, scale point): data-gem-test="${m.option}".
3. The "Next" / "Continue" button between questions or sections: data-gem-test="${m.next}".
4. The final "Submit" / "See my results" button: data-gem-test="${m.submit}".
5. The root element of the results screen that shows the score: data-gem-test="${m.result}". It must only appear once the Hub has accepted the result.
6. If the assessment asks for contact details before submitting, mark the inputs: data-gem-test="${m.firstName}", "${m.lastName}", "${m.company}".
7. Signed-in users on a Hub trial must reach the assessment without extra screens. If a paywall or intro screen appears first, give its continue button data-gem-test="${m.start}" too.
8. Publish, then tell me which of these markers you added and whether any step needs something else to get through.`;
}

/** Ready-to-paste Checkly browser check (Playwright) for one assessment. */
export function checklyScript(app: { key: string; name: string }): string {
  const m = TEST_MARKERS;
  return `// GEM.IQ end-to-end test: ${app.name}. Generated by GEM Hub Central → Admin → Tests.
// Needs the Checkly environment variable GEM_E2E_SECRET.
import { test, expect } from '@playwright/test';

const HUB = '${HUB}';
const KEY = '${app.key}';
const headers = { 'x-gem-e2e-secret': process.env.GEM_E2E_SECRET || '' };
const T = (name: string) => \`[data-gem-test="\${name}"]\`;

test('${app.name}: sign in, take assessment, Hub + HubSpot checks', async ({ page, request }) => {
  test.setTimeout(235_000); // Checkly browser checks stop at 240s

  // 1. Hub creates a fresh test account on a free trial
  const start = await request.post(\`\${HUB}/api/public/e2e/start\`, { headers, data: { assessment_key: KEY } });
  expect(start.ok(), await start.text()).toBeTruthy();
  const run = await start.json();
  console.log('Test address:', run.email, 'run', run.run_id);

  // 2. Sign in through the Hub and land on the assessment
  await page.goto(run.login_url);
  await page.locator(T('auth-email')).fill(run.email);
  await page.locator(T('auth-password')).fill(run.password);
  await page.locator(T('auth-submit')).click();
  if (run.site_url) await page.waitForURL((u) => u.toString().startsWith(run.site_url), { timeout: 60_000 });

  // 3. Start
  await page.locator(T('${m.start}')).first().click({ timeout: 30_000 });

  // 4. Answer everything (middle answer each time) until the result shows
  for (let step = 0; step < 300; step++) {
    if (await page.locator(T('${m.result}')).first().isVisible().catch(() => false)) break;
    for (const [sel, val] of [['${m.firstName}', 'GEM'], ['${m.lastName}', 'Test'], ['${m.company}', 'GEM E2E test']]) {
      const f = page.locator(T(sel)).first();
      if (await f.isVisible().catch(() => false) && !(await f.inputValue().catch(() => 'x'))) await f.fill(val);
    }
    const questions = page.locator(\`\${T('${m.question}')}:visible\`);
    const qn = await questions.count();
    if (qn) {
      for (let i = 0; i < qn; i++) {
        const opts = questions.nth(i).locator(T('${m.option}'));
        const n = await opts.count();
        if (n) await opts.nth(Math.floor(n / 2)).click().catch(() => {});
      }
    } else {
      const opts = page.locator(\`\${T('${m.option}')}:visible\`);
      const n = await opts.count();
      if (n) await opts.nth(Math.floor(n / 2)).click().catch(() => {});
    }
    const submit = page.locator(\`\${T('${m.submit}')}:visible\`).first();
    if (await submit.isVisible().catch(() => false) && await submit.isEnabled().catch(() => false)) {
      await submit.click();
      await page.waitForTimeout(2000);
      continue;
    }
    const next = page.locator(\`\${T('${m.next}')}:visible\`).first();
    if (await next.isVisible().catch(() => false) && await next.isEnabled().catch(() => false)) await next.click();
    await page.waitForTimeout(400);
  }
  await expect(page.locator(T('${m.result}')).first()).toBeVisible({ timeout: 60_000 });

  // 5. Hub checks its own records, HubSpot fields, marketing status and workflows
  let out: any = null;
  for (let i = 0; i < 12; i++) {
    const r = await request.get(\`\${HUB}/api/public/e2e/check/\${run.run_id}\`, { headers });
    out = await r.json();
    if (out.status !== 'running' && out.status !== 'started') break;
    await page.waitForTimeout(10_000);
  }
  for (const c of out?.checks ?? []) console.log(\`[\${c.status}] \${c.label}: \${c.detail ?? ''}\`);
  const bad = (out?.checks ?? []).filter((c: any) => c.status === 'fail' || c.status === 'pending').map((c: any) => c.label);
  expect(out?.status, 'Failing: ' + bad.join(', ')).toBe('pass');
});
`;
}
