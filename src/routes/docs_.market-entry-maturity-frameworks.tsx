import { createFileRoute, Link } from "@tanstack/react-router";
import gemLogo from "@/assets/gem-logo-light-white-mint.png.asset.json";

const URL = "https://gemiq.globaledgemarkets.com/docs/market-entry-maturity-frameworks";
const TITLE = "Market Entry Maturity Assessment: CMMI, TRL & MRL Guide";
const DESCRIPTION =
  "How CMMI and TRL/MRL maturity frameworks apply to market entry strategy — a practical executive readiness benchmarking guide from GEM.IQ.";

const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

export const Route = createFileRoute("/docs_/market-entry-maturity-frameworks")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "GlobalEdgeMarkets" },
          publisher: { "@type": "Organization", name: "GEM.IQ" },
        }),
      },
    ],
  }),
  component: Page,
});

const LEVELS = [
  {
    n: "Level 1",
    cmmi: "Initial / Reactive",
    trl: "TRL 1–3 · MRL 1–3",
    entry:
      "Market interest is opportunistic. No documented entry thesis, no owner, no repeatable qualification of a country or segment.",
  },
  {
    n: "Level 2",
    cmmi: "Managed / Developing",
    trl: "TRL 4–5 · MRL 4–5",
    entry:
      "A first market is chosen and resourced, but decisions rely on individual judgment. Pricing, compliance and channel work restart with each new geography.",
  },
  {
    n: "Level 3",
    cmmi: "Defined",
    trl: "TRL 6–7 · MRL 6–7",
    entry:
      "A documented entry playbook exists: screening criteria, localization scope, regulatory checklist, channel model and a stage-gated launch plan.",
  },
  {
    n: "Level 4",
    cmmi: "Quantitatively Managed / Advanced",
    trl: "TRL 8 · MRL 8–9",
    entry:
      "Entry decisions are driven by instrumented metrics — landed cost, tariff exposure, CAC by market, time-to-first-revenue — with thresholds agreed in advance.",
  },
  {
    n: "Level 5",
    cmmi: "Optimizing",
    trl: "TRL 9 · MRL 10",
    entry:
      "The organization runs continuous portfolio optimization across markets: entering, scaling and exiting on evidence, with the playbook improved every cycle.",
  },
];

function Page() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a16] font-sans text-white antialiased">
      <header className="border-b border-white/10 bg-[#0a0a16]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={gemLogo.url} alt="GEM.IQ" className="h-8 w-auto" />
          </Link>
          <Link to="/docs" className="text-sm font-semibold text-white/70 hover:text-white" style={DISPLAY}>
            Developer docs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50" style={DISPLAY}>
          Guide · Executive readiness benchmarking
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl" style={DISPLAY}>
          Market entry maturity assessment: applying <span className="text-[#05CFAB]">CMMI</span> and{" "}
          <span className="text-[#05CFAB]">TRL/MRL</span> to global expansion
        </h1>
        <p className="mt-5 text-lg text-white/70">
          Maturity models were built for software process and hardware readiness — but the same logic
          explains why one company enters a new market predictably and another burns two years learning
          the same lessons twice. This guide maps CMMI and TRL/MRL onto market entry, then shows how the
          GEM.IQ assessments score it.
        </p>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            The three frameworks in one paragraph each
          </h2>
          <div className="mt-6 space-y-5 text-white/75">
            <p>
              <strong className="text-white">CMMI (Capability Maturity Model Integration)</strong> grades an
              organization on how repeatable and measurable its processes are, across five levels from
              initial to optimizing. It answers: if the person who ran the last launch left tomorrow, could
              you run the next one as well?
            </p>
            <p>
              <strong className="text-white">TRL (Technology Readiness Levels)</strong> grades a technology
              from basic principles (TRL 1) to proven in operational use (TRL 9). In an expansion context,
              it grades whether the offering itself — localized, compliant, supportable — is actually ready
              for the target market, not just ready in the home market.
            </p>
            <p>
              <strong className="text-white">MRL (Manufacturing Readiness Levels)</strong> extends the same
              scale to the ability to produce, source and deliver at rate and cost. For market entry this is
              the supply chain, tariff, landed-cost and fulfillment layer that most entry plans underweight.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            The market entry maturity scale
          </h2>
          <p className="mt-2 text-sm text-white/60">
            GEM.IQ scores every dimension on five tiers — reactive, developing, defined, advanced,
            optimized — which align to CMMI levels and to bands of TRL/MRL readiness.
          </p>
          <div className="mt-8 space-y-4">
            {LEVELS.map((l) => (
              <article
                key={l.n}
                className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#05CFAB]" style={DISPLAY}>
                    {l.n}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight" style={DISPLAY}>
                    {l.cmmi}
                  </h3>
                  <span className="text-xs text-white/45">{l.trl}</span>
                </div>
                <p className="mt-2 text-sm text-white/70">{l.entry}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            How to run the benchmark
          </h2>
          <ol className="mt-6 space-y-4 text-white/75">
            <li>
              <strong className="text-white">1. Pick the unit of analysis.</strong> Score a specific
              market–offering pair, not the company in the abstract. "Us in Germany with the enterprise
              tier" produces an actionable number; "us, globally" does not.
            </li>
            <li>
              <strong className="text-white">2. Score process separately from readiness.</strong> A CMMI
              Level 4 organization can still be TRL 5 in a new market. Conflating them hides the real
              constraint.
            </li>
            <li>
              <strong className="text-white">3. Weight the gating dimensions.</strong> Regulatory,
              tariff/landed cost and support coverage are gates, not averages — a reactive score in any one
              of them caps the whole entry regardless of how strong go-to-market looks.
            </li>
            <li>
              <strong className="text-white">4. Re-score quarterly.</strong> Maturity is a trend line. A
              single score tells you where you are; the delta tells you whether the investment is working.
            </li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            Where GEM.IQ fits
          </h2>
          <p className="mt-3 text-white/75">
            Each GEM.IQ assessment scores one discipline against this same five-tier scale, and the Hub
            rolls them into a single composite view so you can see which dimension is actually gating
            expansion.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { to: "/tariffiq" as const, n: "TariffIQ", d: "Tariff exposure and landed-cost readiness (the MRL layer)." },
              { to: "/gtmiq" as const, n: "GTMIQ", d: "Go-to-market motion, segmentation and launch repeatability." },
              { to: "/salesiq" as const, n: "SalesIQ", d: "Pipeline process maturity and channel capability." },
              { to: "/productiq" as const, n: "ProductIQ", d: "Offering readiness and localization depth (the TRL layer)." },
              { to: "/aitransformiq" as const, n: "AITransformIQ", d: "Operating-model and automation maturity." },
              { to: "/uxiq" as const, n: "UXIQ", d: "Experience readiness for a new market's buyers." },
            ].map((p) => (
              <Link
                key={p.n}
                to={p.to}
                className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.07]"
              >
                <div className="text-base font-bold tracking-tight" style={DISPLAY}>
                  {p.n}
                </div>
                <p className="mt-1 text-sm text-white/60">{p.d}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-gradient-to-br from-[#16213e]/70 to-[#0a0a16]/50 p-8 ring-1 ring-inset ring-white/[0.06] md:p-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            Benchmark your entry readiness
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/65">
            Run a single assessment or unlock the full suite and track maturity quarterly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup", trial: "1" }}
              className="rounded-full bg-[#05CFAB] px-6 py-3 text-sm font-bold text-[#0a0a16]"
              style={DISPLAY}
            >
              Start free trial
            </Link>
            <Link
              to="/"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              style={DISPLAY}
            >
              Back to the Hub
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-4xl px-6 text-xs text-white/45">
          © {new Date().getFullYear()} GlobalEdgeMarkets · GEM.IQ
        </div>
      </footer>
    </div>
  );
}
