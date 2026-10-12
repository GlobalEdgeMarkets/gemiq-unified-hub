// Built-in wording for the Hub home page. Each key can be overridden by an Approved
// GEM.IQ messaging item with the same key; this text is the fallback and the import
// source for "Pull assessment page wording". Prices stay {price.*} tokens.
export type PageCopyEntry = { key: string; label: string; value: string };

export const HOME_COPY: PageCopyEntry[] = [
  { key: "home.hero.title", label: "Home: headline", value: "Make-or-break calls deserve more than" },
  { key: "home.hero.title_accent", label: "Home: headline (highlighted end)", value: "a gut feel." },
  { key: "home.hero.body", label: "Home: intro paragraph", value: "Market entry, tariff exposure, go-to-market, delivery capacity, AI spend — these are risk-based bets that decide whether a company compounds or stalls. GEM.IQ, the diagnostic suite from GlobalEdgeMarkets, scores each one across weighted, independent dimensions and returns a gap map, not a vanity number. One identity, one subscription, one benchmarked view of where you actually stand." },
  { key: "home.hero.featuring", label: "Home: rotating label", value: "Now featuring" },
  { key: "home.offer.badge", label: "Home: offer badge", value: "Limited launch offer" },
  { key: "home.offer.body", label: "Home: offer text", value: "Buy a single IQ when you need one answer. Or pick three with Growth, or take all six with Complete — both include the combined GEM.IQ report." },
  { key: "home.offer.buy_button", label: "Home: buy-one button", value: "Buy one assessment" },
  { key: "home.intel.badge", label: "Home: image panel badge", value: "Live intelligence" },
  { key: "home.numbers.label", label: "Home: numbers panel label", value: "GEM.IQ · By the numbers" },
  { key: "home.globe.label", label: "Home: benchmark panel label", value: "One planet, one platform" },
  { key: "home.globe.title", label: "Home: benchmark panel heading", value: "Benchmark against global peers." },
  { key: "home.globe.body", label: "Home: benchmark panel text", value: "Country, industry, and stage-weighted percentiles — updated continuously." },
  { key: "home.specialist.label", label: "Home: specialist panel label", value: "Who this is for" },
  { key: "home.specialist.body", label: "Home: specialist panel text", value: "A specialist diagnostic only applies if you carry that exposure. If you import, manufacture abroad, or pay duty, TariffIQ is scored the same way as the capability IQs — but the output is a recoverable dollar figure. No exposure, no need to run it." },
  { key: "home.specialist.note", label: "Home: specialist panel footnote", value: "Included in the suite plan alongside every capability diagnostic. More specialist diagnostics are in development." },
  { key: "home.methodology.label", label: "Home: methodology tile label", value: "Executive-grade methodologies" },
  { key: "home.methodology.title", label: "Home: methodology tile heading", value: "CMMI · TRL/MRL · WCAG · Tariff engineering doctrine" },
  { key: "home.methodology.body", label: "Home: methodology tile text", value: "Every IQ is built on a peer-reviewed framework — so scores map to language your board already speaks." },
  { key: "home.benchmark.label", label: "Home: dashboard tile label", value: "Unified benchmarking" },
  { key: "home.benchmark.title", label: "Home: dashboard tile heading", value: "One dashboard. Every dimension." },
  { key: "home.benchmark.body", label: "Home: dashboard tile text", value: "Compare your organization across assessments, retakes, and industry peers — all from one view." },
  { key: "home.pricing.title", label: "Pricing: heading", value: "One answer, or" },
  { key: "home.pricing.title_accent", label: "Pricing: heading (highlighted end)", value: "the whole picture." },
  { key: "home.pricing.body", label: "Pricing: intro", value: "Start with one assessment, build a picture with three, or see your whole business with all six and the combined GEM.IQ score." },
  { key: "home.pricing.starter.sub", label: "Pricing: Starter subtitle", value: "One IQ, one report, no subscription." },
  { key: "home.pricing.starter.features", label: "Pricing: Starter features (one per line)", value: "Any one IQ of your choice\nFull dimension-level scoring and tier\nExecutive-ready PDF report\nMethodology and “why we ask this” for every question" },
  { key: "home.pricing.starter.note", label: "Pricing: Starter footnote", value: "No recurring charge." },
  { key: "home.pricing.growth.sub", label: "Pricing: Growth subtitle", value: "Any 3 IQs plus the combined report." },
  { key: "home.pricing.growth.features", label: "Pricing: Growth features (one per line)", value: "3 assessments you choose — the first 3 you take are yours\nRetake your assessments any time\nCombined GEM.IQ score across your three\nUpgrade to Complete whenever you want more" },
  { key: "home.pricing.complete.sub", label: "Pricing: Complete subtitle", value: "All 6 IQs, the full picture." },
  { key: "home.pricing.complete.badge", label: "Pricing: Complete badge", value: "Best value" },
  { key: "home.pricing.complete.features", label: "Pricing: Complete features (one per line)", value: "All 6 GEM.IQ assessments — capability and specialist\nCombined GEM.IQ Business Health score and report\nQuarterly retakes with progress tracking\nDimension-level detail and executive PDFs" },
  { key: "home.pricing.guarantee", label: "Pricing: guarantee line (after the guarantee)", value: "on both options — no questions asked." },
  { key: "home.cta.title", label: "Final call: heading", value: "Ready to quantify your" },
  { key: "home.cta.title_accent", label: "Final call: heading (highlighted end)", value: "global readiness?" },
  { key: "home.cta.body", label: "Final call: text", value: "Sign up once. Take any assessment in under 10 minutes. Get executive-ready benchmarks in your inbox." },
  { key: "home.cta.primary", label: "Final call: main button", value: "Create your account" },
  { key: "home.cta.secondary", label: "Final call: second button", value: "I already have an account" },
];

const DEFAULTS: Record<string, string> = Object.fromEntries(HOME_COPY.map((e) => [e.key, e.value]));

/** Lookup: Approved messaging value if present, else built-in text. */
export function makeCopy(byKey: Record<string, string> | null | undefined, fill: (v: string) => string = (v) => v) {
  return (key: string): string => fill(byKey?.[key] ?? DEFAULTS[key] ?? "");
}
