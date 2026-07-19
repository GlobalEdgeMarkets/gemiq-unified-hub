import { createFileRoute, Link } from "@tanstack/react-router";
import gemLogoDark from "@/assets/gem-logo-dark.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GEM.IQ Hub — Executive assessments across tariffs, market entry, UX, and services" },
      {
        name: "description",
        content:
          "The GEM.IQ Hub by GlobalEdgeMarkets — one identity, one subscription, and a unified dashboard across every GEM.IQ executive assessment.",
      },
      { property: "og:title", content: "GEM.IQ Hub — One account across every GEM.IQ assessment" },
      {
        property: "og:description",
        content:
          "One identity, one subscription, and a unified dashboard across every GEM.IQ executive assessment.",
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
  body: string;
  live: boolean;
  accent: "mint" | "navy" | "gold" | "purple";
  icon: "globe" | "briefcase" | "sparkles" | "cog";
};

const ASSESSMENTS: Assessment[] = [
  {
    key: "tariffiq",
    name: "Tariff",
    suffix: "IQ",
    url: "https://tariffiq.globaledgemarkets.com",
    eyebrow: "Quantify duty exposure and savings opportunity",
    body: "Eight dimensions of tariff engineering maturity — from HTS classification to first-sale and FTZ readiness. Get an annualized savings estimate in under 10 minutes.",
    live: true,
    accent: "mint",
    icon: "globe",
  },
  {
    key: "readinessiq",
    name: "Readiness",
    suffix: "IQ",
    url: "https://readinessiq.globaledgemarkets.com",
    eyebrow: "Measure market, sales, product, and AI readiness",
    body: "Four executive assessments across market entry, enterprise sales, productization, and AI transformation — CMMI/TRL-weighted scoring tailored to your growth stage.",
    live: true,
    accent: "navy",
    icon: "briefcase",
  },
  {
    key: "uxiq",
    name: "UX",
    suffix: "IQ",
    url: "https://uxreadiness.globaledgemarkets.com",
    eyebrow: "Benchmark digital experience maturity",
    body: "Score research, design system, accessibility, and conversion craft against best-in-class peers — with dimension-level tiering and prioritized recommendations.",
    live: true,
    accent: "purple",
    icon: "sparkles",
  },
  {
    key: "techservicesiq",
    name: "TechServices",
    suffix: "IQ",
    url: "https://techservicesiq.globaledgemarkets.com",
    eyebrow: "Assess professional services delivery health",
    body: "Engagement, delivery, staffing, and margin performance across your services organization — surface leaks in utilization, scoping, and repeatability.",
    live: false,
    accent: "gold",
    icon: "cog",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Sign in once",
    body: "One GEM.IQ account works across every assessment on globaledgemarkets.com — no separate logins.",
  },
  {
    n: 2,
    title: "Pick an assessment",
    body: "Choose the IQ that matches the decision in front of you — take it in under 10 minutes.",
  },
  {
    n: 3,
    title: "Get instant results",
    body: "Scores, dimension tiering, and benchmarks stream into your unified GEM.IQ dashboard.",
  },
];

const WHY = [
  {
    title: "One identity, every assessment",
    body: "A single GEM.IQ account carries your profile, results, and subscription across every assessment domain.",
    icon: "id",
  },
  {
    title: "Executive-grade methodologies",
    body: "Each IQ is built on a peer-reviewed framework — CMMI, TRL/MRL, WCAG, or tariff engineering doctrine.",
    icon: "shield",
  },
  {
    title: "Unified benchmarking",
    body: "Compare your organization across assessments, retakes, and industry peers from one dashboard.",
    icon: "chart",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-white font-sans text-gem-ink antialiased">
      <TopBar />
      <Hero />
      <Stats />
      <AssessmentGrid />
      <HowItWorks />
      <WhyGemIQ />
      <Pricing />
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gem-navy/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={gemLogoDark.url} alt="GEM" className="h-8 w-auto" />
          <span className="hidden h-6 w-px bg-gem-navy/20 sm:block" />
          <span className="hidden font-display text-lg font-bold tracking-tight text-gem-navy sm:inline">
            GEM.IQ Hub
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-6">
          <a href="#assessments" className="hidden text-gem-navy/70 hover:text-gem-navy sm:inline">
            Assessments
          </a>
          <a href="#pricing" className="hidden text-gem-navy/70 hover:text-gem-navy sm:inline">
            Pricing
          </a>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gem-navy hover:bg-gem-navy/5"
          >
            <ChartIcon className="h-4 w-4" />
            My Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0a1226] text-white">
      {/* Atmospheric background */}
      <div aria-hidden className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 80% 30%, rgba(5,207,171,0.18), transparent 60%), radial-gradient(80% 60% at 10% 80%, rgba(45,21,148,0.35), transparent 65%)",
          }}
        />
        {/* Subtle network dots */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-gem-mint/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-mint">
            The GEM.IQ Assessment Platform
          </span>

          <h1 className="mt-8 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Global Complexity.<br />
            <span className="text-gem-mint">Quantified Clarity.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            The GEM.IQ Hub unifies every GlobalEdgeMarkets executive assessment behind one identity, one
            subscription, and one dashboard — so your team benchmarks tariffs, market entry, digital
            experience, and services delivery from a single view.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-md bg-gem-mint px-6 py-3.5 text-sm font-semibold text-gem-navy shadow-lg shadow-gem-mint/20 transition hover:brightness-105"
            >
              Create your GEM.IQ account
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <a
              href="#assessments"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              Explore assessments
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { icon: <TargetIcon />, v: "4", l: "Assessments" },
    { icon: <BoltIcon />, v: "28+", l: "Dimensions" },
    { icon: <SparkleIcon />, v: "AI-Powered", l: "Reports" },
    { icon: <ClockIcon />, v: "<10 min", l: "Per assessment" },
  ];
  return (
    <section className="border-b border-gem-navy/10 bg-white py-14">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="flex flex-col items-center text-center">
            <div className="text-gem-mint">{s.icon}</div>
            <div className="mt-2 font-display text-2xl font-bold text-gem-navy">{s.v}</div>
            <div className="text-xs uppercase tracking-wider text-gem-navy/50">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssessmentGrid() {
  return (
    <section id="assessments" className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-gem-navy sm:text-5xl">
            Choose Your Assessment
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gem-navy/60">
            Evaluate your maturity across critical dimensions. Identify risks, uncover gaps, and build confidence
            for growth.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {ASSESSMENTS.map((a) => (
            <AssessmentCard key={a.key} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

const ACCENTS: Record<Assessment["accent"], { bar: string; tileBg: string; tileFg: string; eyebrow: string; button: string }> = {
  mint: {
    bar: "bg-gem-mint",
    tileBg: "bg-gem-mint/15",
    tileFg: "text-gem-mint",
    eyebrow: "text-gem-mint",
    button: "bg-gem-mint text-gem-navy hover:brightness-105",
  },
  navy: {
    bar: "bg-[#5aa9c9]",
    tileBg: "bg-[#5aa9c9]/15",
    tileFg: "text-[#3785a4]",
    eyebrow: "text-[#3785a4]",
    button: "bg-gem-navy text-white hover:bg-gem-navy/90",
  },
  gold: {
    bar: "bg-[#e8b64a]",
    tileBg: "bg-[#e8b64a]/15",
    tileFg: "text-[#b58722]",
    eyebrow: "text-[#b58722]",
    button: "bg-[#e8b64a] text-gem-navy hover:brightness-105",
  },
  purple: {
    bar: "bg-gem-purple",
    tileBg: "bg-gem-purple/12",
    tileFg: "text-gem-purple",
    eyebrow: "text-gem-purple",
    button: "bg-gem-purple text-white hover:brightness-110",
  },
};

function AssessmentCard({ a }: { a: Assessment }) {
  const c = ACCENTS[a.accent];
  const Wrapper: any = a.live ? "a" : "div";
  const wrapperProps = a.live ? { href: a.url, target: "_blank", rel: "noreferrer" } : {};
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gem-navy/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className={`h-1 w-full ${c.bar}`} />
      <div className="p-8">
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.tileBg} ${c.tileFg}`}>
            <AssessmentIcon name={a.icon} className="h-6 w-6" />
          </div>
          {!a.live && (
            <span className="rounded-full border border-gem-navy/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gem-navy/50">
              Coming soon
            </span>
          )}
        </div>

        <h3 className="mt-6 font-display text-2xl font-bold text-gem-navy">
          {a.name}
          {a.suffix}
        </h3>
        <p className={`mt-1 text-sm font-medium ${c.eyebrow}`}>{a.eyebrow}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-gem-navy/65">{a.body}</p>

        <Wrapper
          {...wrapperProps}
          className={`mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition ${
            a.live ? c.button : "cursor-not-allowed bg-gem-navy/10 text-gem-navy/40"
          }`}
        >
          {a.live ? "Start Assessment" : "In development"}
          {a.live && <ArrowIcon className="h-4 w-4" />}
        </Wrapper>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="bg-gem-cream py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-gem-mint/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-mint">
            How It Works
          </span>
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-gem-navy sm:text-5xl">
            Three Steps to Clarity
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gem-navy/60">
            From registration to actionable insights across every GEM.IQ assessment — in under 15 minutes.
          </p>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative text-center">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-gem-navy/5">
                <StepIcon n={s.n} className="h-8 w-8 text-gem-mint" />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gem-mint text-xs font-bold text-gem-navy">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl font-bold text-gem-navy">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gem-navy/60">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyGemIQ() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-gem-purple/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-purple">
            Why GEM.IQ
          </span>
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-gem-navy sm:text-5xl">
            Built for growth-stage companies
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gem-navy/60">
            Stop guessing. Start scaling with data-driven readiness intelligence unified across every dimension of
            your business.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {WHY.map((w) => (
            <div
              key={w.title}
              className="rounded-2xl border border-gem-navy/10 bg-gem-cream/50 p-8 transition hover:border-gem-mint/40 hover:bg-white hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gem-mint/15 text-gem-mint">
                <WhyIcon name={w.icon} className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-lg font-bold text-gem-navy">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gem-navy/65">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-gem-cream py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-gem-navy/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-navy/70">
            Pricing
          </span>
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-gem-navy sm:text-5xl">
            One subscription. Every assessment.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gem-navy/60">
            GEM.IQ Professional gives your team unlimited access to every assessment, retake history, and
            executive-ready benchmarking exports.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <PricingCard
            plan="Monthly"
            price="$99"
            unit="/ month"
            note="Cancel any time from the billing portal."
          />
          <PricingCard
            plan="Annual"
            price="$990"
            unit="/ year"
            note="Two months on us — best for teams committed to quarterly benchmarking."
            featured
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
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${
        featured
          ? "bg-gem-navy text-white shadow-xl"
          : "border border-gem-navy/10 bg-white text-gem-navy shadow-sm"
      }`}
    >
      {featured && <div className="h-1 w-full bg-gem-mint" />}
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div className={`font-display text-xl font-bold ${featured ? "text-white" : "text-gem-navy"}`}>{plan}</div>
          {featured && (
            <span className="rounded-full bg-gem-mint px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gem-navy">
              Best value
            </span>
          )}
        </div>
        <div className="mt-6 flex items-baseline gap-2">
          <div className={`font-display text-5xl font-bold ${featured ? "text-white" : "text-gem-navy"}`}>{price}</div>
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
          className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition ${
            featured
              ? "bg-gem-mint text-gem-navy hover:brightness-105"
              : "bg-gem-navy text-white hover:bg-gem-navy/90"
          }`}
        >
          Start with {plan.toLowerCase()}
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <p className={`mt-4 text-xs ${featured ? "text-white/50" : "text-gem-navy/50"}`}>{note}</p>
      </div>
    </div>
  );
}

function PricingLine({ children, featured }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-gem-mint" : "text-gem-mint"}`}
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

function Footer() {
  return (
    <footer className="bg-gem-navy py-14 text-white/70">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-4 border-b border-white/10 pb-10 text-center">
          <img src={gemLogoDark.url} alt="GEM" className="h-9 w-auto brightness-0 invert" />
          <p className="max-w-md text-sm text-white/60">
            Powered by GlobalEdgeMarkets. The GEM.IQ and GEM Methodology are trademarks of GlobalEdgeMarkets.
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-xs text-white/50 sm:flex-row">
          <div>© {new Date().getFullYear()} GlobalEdgeMarkets. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="mailto:hello@globaledgemarkets.com" className="hover:text-white">
              hello@globaledgemarkets.com
            </a>
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white">
              Disclaimer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Icons ---------- */

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h12m0 0l-5-5m5 5l-5 5" />
    </svg>
  );
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17V9m5 8V5m5 12v-6m5 6V3" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 4.8L18.5 9.5 13.8 11.2 12 16l-1.8-4.8L5.5 9.5l4.7-1.7L12 3zM19 15l.9 2.4 2.4.9-2.4.9L19 21.6l-.9-2.4-2.4-.9 2.4-.9L19 15z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function AssessmentIcon({ name, className = "" }: { name: Assessment["icon"]; className?: string }) {
  switch (name) {
    case "globe":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path strokeLinecap="round" d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14z" />
        </svg>
      );
    case "cog":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.4 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.4 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.4-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.4-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.4H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.4l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.4 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      );
  }
}

function StepIcon({ n, className = "" }: { n: number; className?: string }) {
  if (n === 1)
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6v3H9zM9 12l2 2 4-4" />
      </svg>
    );
  if (n === 2)
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
        <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17V9m5 8V5m5 12v-6m5 6V3" />
    </svg>
  );
}

function WhyIcon({ name, className = "" }: { name: string; className?: string }) {
  if (name === "id")
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="12" r="2.5" />
        <path strokeLinecap="round" d="M14 10h4M14 14h3" />
      </svg>
    );
  if (name === "shield")
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />
      </svg>
    );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 5-6" />
    </svg>
  );
}
