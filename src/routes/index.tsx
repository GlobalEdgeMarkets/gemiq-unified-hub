import { createFileRoute, Link } from "@tanstack/react-router";
import gemLogoLight from "@/assets/gem-logo-light.png.asset.json";
import gemLogoDark from "@/assets/gem-logo-dark.png.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GEM.IQ — Assessments that turn global complexity into clarity" },
      {
        name: "description",
        content:
          "The GEM.IQ platform by GlobalEdgeMarkets — a family of executive assessments across tariffs, market readiness, digital experience, and tech services delivery.",
      },
      { property: "og:title", content: "GEM.IQ — The GlobalEdgeMarkets assessment platform" },
      {
        property: "og:description",
        content:
          "One login. One subscription. Four executive assessments benchmarking tariff, market, UX, and tech-services readiness.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

type Assessment = {
  key: string;
  name: string;
  suffix: string;
  url: string;
  eyebrow: string;
  headline: string;
  body: string;
  live: boolean;
};

const ASSESSMENTS: Assessment[] = [
  {
    key: "tariffiq",
    name: "Tariff",
    suffix: "IQ",
    url: "https://tariffiq.globaledgemarkets.com",
    eyebrow: "Tariff engineering readiness",
    headline: "How much are tariffs costing your business?",
    body: "Eight dimensions of tariff engineering maturity — quantifies annual duty savings opportunity in under 10 minutes.",
    live: true,
  },
  {
    key: "readinessiq",
    name: "Readiness",
    suffix: "IQ",
    url: "https://readinessiq.globaledgemarkets.com",
    eyebrow: "Global market readiness",
    headline: "Are you ready to scale globally?",
    body: "Market, enterprise sales, productization, and AI transformation readiness — tailored to your growth stage.",
    live: true,
  },
  {
    key: "uxiq",
    name: "UX",
    suffix: "IQ",
    url: "https://uxreadiness.globaledgemarkets.com",
    eyebrow: "Digital experience readiness",
    headline: "Is your product converting the customers you deserve?",
    body: "Benchmark UX maturity across research, design system, accessibility, and conversion craft.",
    live: true,
  },
  {
    key: "techservicesiq",
    name: "TechServices",
    suffix: "IQ",
    url: "https://techservicesiq.globaledgemarkets.com",
    eyebrow: "Tech services delivery",
    headline: "How mature is your services delivery engine?",
    body: "Assess engagement, delivery, staffing, and margin performance across your professional services organization.",
    live: false,
  },
];

const STEPS = [
  { n: "01", title: "Sign in once", body: "One GEM.IQ account works across every assessment on globaledgemarkets.com." },
  { n: "02", title: "Pick an assessment", body: "Choose the IQ that matches the decision in front of you — take it in under 10 minutes." },
  { n: "03", title: "Get your score", body: "Instant results with dimension-level tiering and benchmark context." },
  { n: "04", title: "Track over time", body: "Retake, compare, and share results with your team from one unified dashboard." },
];

function Index() {
  return (
    <div className="min-h-screen bg-gem-cream font-sans text-gem-ink antialiased">
      <TopBar />
      <Hero />
      <Stats />
      <AssessmentGrid />
      <HowItWorks />
      <Pricing />
      <TrustBar />
      <Footer />
    </div>
  );
}

function Wordmark({ variant = "light" }: { variant?: "light" | "dark" }) {
  const src = variant === "light" ? gemLogoLight.url : gemLogoDark.url;
  return (
    <span className="inline-flex items-baseline gap-2">
      <img src={src} alt="GEM" className="h-7 w-auto sm:h-8" />
      <span className={`font-display text-2xl font-bold tracking-tight ${variant === "light" ? "text-white" : "text-gem-navy"}`}>
        .IQ
      </span>
    </span>
  );
}


function TopBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-6 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark />
          <span className="hidden text-sm text-white/60 sm:inline">by GlobalEdgeMarkets</span>
        </div>
        <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-6">
          <a href="#assessments" className="hidden text-white/80 hover:text-white sm:inline">Assessments</a>
          <a href="#pricing" className="hidden text-white/80 hover:text-white sm:inline">Pricing</a>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="rounded-full px-4 py-2 text-white/90 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full bg-gem-mint px-4 py-2 font-medium text-gem-navy transition hover:brightness-105"
          >
            Get started
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gem-navy pt-32 pb-24 text-white sm:pt-40 sm:pb-32">
      {/* atmospheric background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 20%, rgba(124,241,201,0.18) 0%, rgba(14,30,61,0) 60%), radial-gradient(50% 40% at 15% 80%, rgba(124,241,201,0.10) 0%, rgba(14,30,61,0) 60%)",
        }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gem-mint/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gem-mint uppercase">
              <span className="h-px w-8 bg-gem-mint" />
              The GlobalEdgeMarkets assessment platform
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Global complexity,<br />
              <span className="text-gem-mint">quantified.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-white/70">
              GEM.IQ is a family of executive assessments that benchmark your organization across tariffs,
              market entry, digital experience, and services delivery — with instant scoring, dimension-level
              tiering, and comparison against industry peers.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-full bg-gem-mint px-6 py-3.5 font-medium text-gem-navy transition hover:brightness-105"
              >
                Create your GEM.IQ account
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#assessments"
                className="inline-flex items-center gap-2 text-sm text-white/80 underline decoration-gem-mint/50 decoration-2 underline-offset-8 hover:text-white"
              >
                Explore the assessments
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
              <Check>4 executive assessments</Check>
              <Check>One login, one subscription</Check>
              <Check>Results in under 10 minutes</Check>
            </div>
          </div>

          {/* Right rail — assessment stack preview */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-gem-mint/10 via-transparent to-transparent blur-2xl" />
            <div className="relative space-y-4">
              {ASSESSMENTS.slice(0, 3).map((a, i) => (
                <div
                  key={a.key}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:border-gem-mint/40 hover:bg-white/[0.06]"
                  style={{ transform: `translateX(${i * 12}px)` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-display text-2xl">
                      {a.name}<span className="text-gem-mint">{a.suffix}</span>
                    </div>
                    {a.live ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gem-mint/15 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-gem-mint uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-gem-mint" /> Live
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-widest text-white/50">{a.eyebrow}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="h-4 w-4 text-gem-mint" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
      </svg>
      {children}
    </span>
  );
}

function Stats() {
  const stats = [
    { v: "4", l: "executive assessments in the family" },
    { v: "28+", l: "dimensions benchmarked across the platform" },
    { v: "<10 min", l: "average time to a complete score" },
    { v: "$2.4M", l: "average duty savings identified per engagement" },
  ];
  return (
    <section className="border-b border-gem-navy/10 bg-gem-cream py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-6 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="font-display text-4xl text-gem-navy sm:text-5xl">{s.v}</div>
            <div className="mt-2 max-w-[16ch] text-sm text-gem-navy/60">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssessmentGrid() {
  return (
    <section id="assessments" className="bg-gem-cream py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.2em] text-gem-navy/50 uppercase">The assessments</div>
          <h2 className="mt-4 font-display text-4xl tracking-tight text-gem-navy sm:text-5xl">
            Pick the IQ that matches the decision in front of you.
          </h2>
          <p className="mt-4 text-lg text-gem-navy/60">
            Every GEM.IQ assessment lives at its own domain, shares a single login, and rolls results back into your
            unified GEM.IQ dashboard.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {ASSESSMENTS.map((a, i) => (
            <AssessmentCard key={a.key} a={a} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AssessmentCard({ a, index }: { a: Assessment; index: number }) {
  const Wrapper = a.live ? "a" : "div";
  const wrapperProps = a.live ? { href: a.url, target: "_blank", rel: "noreferrer" } : {};
  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`group relative flex flex-col justify-between rounded-3xl border border-gem-navy/10 bg-white p-8 transition ${
        a.live ? "hover:-translate-y-0.5 hover:border-gem-navy/30 hover:shadow-[0_20px_60px_-30px_rgba(14,30,61,0.35)]" : "opacity-90"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gem-navy text-xs font-semibold text-white">
            {String(index).padStart(2, "0")}
          </span>
          {a.live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gem-mint/20 px-3 py-1 text-[10px] font-semibold tracking-wider text-gem-navy uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-gem-navy" /> Live
            </span>
          ) : (
            <span className="rounded-full border border-gem-navy/15 px-3 py-1 text-[10px] font-semibold tracking-wider text-gem-navy/50 uppercase">
              Coming soon
            </span>
          )}
        </div>

        <div className="mt-8 font-display text-4xl tracking-tight text-gem-navy sm:text-5xl">
          {a.name}<span className="text-gem-mint">{a.suffix}</span>
        </div>
        <div className="mt-3 text-xs font-semibold tracking-[0.18em] text-gem-navy/50 uppercase">{a.eyebrow}</div>

        <h3 className="mt-6 font-display text-2xl leading-snug text-gem-navy">{a.headline}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-gem-navy/65">{a.body}</p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-sm font-medium text-gem-navy">
        {a.live ? (
          <>
            <span className="transition group-hover:text-gem-navy">Launch {a.name}{a.suffix}</span>
            <span aria-hidden className="transition group-hover:translate-x-1">→</span>
          </>
        ) : (
          <span className="text-gem-navy/50">In development</span>
        )}
      </div>
    </Wrapper>
  );
}

function HowItWorks() {
  return (
    <section className="bg-gem-navy py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start lg:gap-16">
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] text-gem-mint uppercase">How it works</div>
            <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
              One account. Every assessment. <span className="text-gem-mint">Zero friction.</span>
            </h2>

            <p className="mt-6 text-white/60">
              GEM.IQ Hub is the connective tissue between every assessment — a single identity, one subscription,
              and a shared results feed.
            </p>
          </div>

          <ol className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-gem-navy p-8">
                <div className="font-display text-3xl text-gem-mint">{s.n}</div>
                <div className="mt-4 font-display text-xl">{s.title}</div>
                <p className="mt-2 text-sm text-white/60">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-gem-cream py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <div className="text-xs font-semibold tracking-[0.2em] text-gem-navy/50 uppercase">Pricing</div>
          <h2 className="mt-4 font-display text-4xl tracking-tight text-gem-navy sm:text-5xl">
            One subscription unlocks the full GEM.IQ family.
          </h2>
          <p className="mt-4 text-lg text-gem-navy/60">
            GEM.IQ Professional gives your team unlimited access to every assessment, retake history, and
            executive-ready benchmarking exports.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          <PricingCard
            plan="Monthly"
            price="$99"
            unit="/ month"
            note="Cancel any time from the billing portal."
            lookupKey="gemiq_professional_monthly"
          />
          <PricingCard
            plan="Annual"
            price="$990"
            unit="/ year"
            note="Two months on us — best for teams committed to quarterly benchmarking."
            featured
            lookupKey="gemiq_professional_annual"
          />
        </div>

        <p className="mt-10 text-center text-sm text-gem-navy/50">
          Every assessment includes a free first take. Subscribe when you're ready to unlock retakes, history, and benchmarks.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  price,
  unit,
  note,
  featured,
}: {
  plan: string;
  price: string;
  unit: string;
  note: string;
  featured?: boolean;
  lookupKey: string;
}) {
  return (
    <div
      className={`rounded-3xl p-8 ${
        featured
          ? "bg-gem-navy text-white shadow-[0_30px_80px_-40px_rgba(14,30,61,0.6)]"
          : "border border-gem-navy/10 bg-white text-gem-navy"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`font-display text-xl ${featured ? "text-white" : "text-gem-navy"}`}>{plan}</div>
        {featured && (
          <span className="rounded-full bg-gem-mint px-3 py-1 text-[10px] font-semibold tracking-wider text-gem-navy uppercase">
            Best value
          </span>
        )}
      </div>
      <div className="mt-6 flex items-baseline gap-2">
        <div className={`font-display text-6xl tracking-tight ${featured ? "text-white" : "text-gem-navy"}`}>{price}</div>
        <div className={featured ? "text-white/60" : "text-gem-navy/50"}>{unit}</div>
      </div>
      <ul className={`mt-6 space-y-3 text-sm ${featured ? "text-white/80" : "text-gem-navy/70"}`}>
        <PricingLine featured={featured}>Unlimited access to every GEM.IQ assessment</PricingLine>
        <PricingLine featured={featured}>Full retake history and score-over-time tracking</PricingLine>
        <PricingLine featured={featured}>Dimension-level benchmarks and executive PDFs</PricingLine>
        <PricingLine featured={featured}>Priority sync into HubSpot for your team</PricingLine>
      </ul>
      <Link
        to="/auth"
        search={{ mode: "signup" }}
        className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-medium transition ${
          featured
            ? "bg-gem-mint text-gem-navy hover:brightness-105"
            : "border border-gem-navy text-gem-navy hover:bg-gem-navy hover:text-white"
        }`}
      >
        Start with {plan.toLowerCase()}
        <span aria-hidden>→</span>
      </Link>
      <p className={`mt-4 text-xs ${featured ? "text-white/50" : "text-gem-navy/50"}`}>{note}</p>
    </div>
  );
}

function PricingLine({ children, featured }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-gem-mint" : "text-gem-navy"}`}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function TrustBar() {
  const logos = ["MAERSK", "FLEXPORT", "CH ROBINSON", "WCO", "KPMG"];
  return (
    <section className="border-y border-gem-navy/10 bg-gem-cream py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center text-xs font-semibold tracking-[0.25em] text-gem-navy/50 uppercase">
          Industry-leading organizations shaping global markets
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
          {logos.map((l) => (
            <div key={l} className="font-display text-xl tracking-widest text-gem-navy">
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gem-navy-deep py-16 text-white/70">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm text-white/50">
              GEM.IQ is a product of GlobalEdgeMarkets — helping executive teams quantify readiness across the
              decisions that move the business.
            </p>
          </div>

          <FooterCol title="Assessments">
            {ASSESSMENTS.map((a) => (
              <li key={a.key}>
                <a
                  href={a.live ? a.url : undefined}
                  className={a.live ? "hover:text-white" : "cursor-not-allowed text-white/30"}
                  target={a.live ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  {a.name}
                  {a.suffix}
                  {!a.live && " (soon)"}
                </a>
              </li>
            ))}
          </FooterCol>

          <FooterCol title="Account">
            <li>
              <Link to="/auth" search={{ mode: "signin" }} className="hover:text-white">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/auth" search={{ mode: "signup" }} className="hover:text-white">
                Create account
              </Link>
            </li>
            <li>
              <a href="#pricing" className="hover:text-white">
                Pricing
              </a>
            </li>
          </FooterCol>

          <FooterCol title="Company">
            <li>
              <a href="https://globaledgemarkets.com" className="hover:text-white" target="_blank" rel="noreferrer">
                GlobalEdgeMarkets
              </a>
            </li>
            <li>
              <a href="mailto:hello@globaledgemarkets.com" className="hover:text-white">
                Contact
              </a>
            </li>
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} GlobalEdgeMarkets. All rights reserved.</div>
          <div>gemiq.globaledgemarkets.com</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-[0.2em] text-white uppercase">{title}</div>
      <ul className="mt-4 space-y-2 text-sm">{children}</ul>
    </div>
  );
}
