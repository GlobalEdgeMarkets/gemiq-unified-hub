import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import gemLogo from "@/assets/gem-logo-light-white-mint.png.asset.json";
import heroVideo from "@/assets/hero-ai-network.mp4.asset.json";
import themeTariff from "@/assets/theme-tariff.jpg";
import themeReadiness from "@/assets/theme-readiness.jpg";
import themeUx from "@/assets/theme-ux.jpg";
import themeServices from "@/assets/theme-services.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GEM.IQ Hub — Executive assessments for global readiness" },
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
      { property: "og:url", content: "https://gemiq.globaledgemarkets.com/" },
    ],
    links: [{ rel: "canonical", href: "https://gemiq.globaledgemarkets.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "GEM.IQ",
          url: "https://gemiq.globaledgemarkets.com",
          logo: "https://gemiq.globaledgemarkets.com/brand/gem-logo-standard.png",
          parentOrganization: { "@type": "Organization", name: "GlobalEdgeMarkets" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "GEM.IQ Hub",
          url: "https://gemiq.globaledgemarkets.com",
        }),
      },
    ],
  }),
  component: Index,
});

type Accent = "mint" | "violet" | "cyan" | "amber";

type Assessment = {
  key: string;
  name: string;
  url: string;
  tagline: string;
  body: string;
  live: boolean;
  accent: Accent;
  domain: string;
  image: string;
};

const ASSESSMENTS: Assessment[] = [
  {
    key: "tariffiq",
    name: "TariffIQ",
    url: "https://tariffiq.globaledgemarkets.com",
    tagline: "Duty exposure & savings",
    body: "Eight dimensions of tariff engineering maturity — HTS classification, first-sale, FTZ readiness. Annualized savings estimate in under 10 minutes.",
    live: true,
    accent: "mint",
    domain: "Global Trade & Supply Chain",
    image: themeTariff,
  },
  {
    key: "readinessiq",
    name: "ReadinessIQ",
    url: "https://readinessiq.globaledgemarkets.com",
    tagline: "Go-to-market maturity",
    body: "Four executive assessments across market entry, enterprise sales, productization, and AI transformation — CMMI/TRL-weighted scoring for your growth stage.",
    live: true,
    accent: "violet",
    domain: "GoToMarket Strategy",
    image: themeReadiness,
  },
  {
    key: "uxiq",
    name: "UXIQ",
    url: "https://uxreadiness.globaledgemarkets.com",
    tagline: "Digital & AI experience",
    body: "Benchmark research, design system, accessibility, and conversion craft against best-in-class peers — dimension-level tiering with prioritized recommendations.",
    live: true,
    accent: "cyan",
    domain: "Digital & AI Experience",
    image: themeUx,
  },
  {
    key: "techservicesiq",
    name: "TechServicesIQ",
    url: "https://techservicesiq.globaledgemarkets.com",
    tagline: "Services delivery health",
    body: "Engagement, delivery, staffing, and margin performance across your services organization — surface leaks in utilization, scoping, and repeatability.",
    live: false,
    accent: "amber",
    domain: "Product & Service Delivery",
    image: themeServices,
  },
];


const ACCENT: Record<Accent, { text: string; ring: string; dot: string; glow: string; chip: string }> = {
  mint:   { text: "text-[#4ade80]", ring: "hover:border-[#4ade80]/50", dot: "bg-[#4ade80]",   glow: "shadow-[0_0_40px_-8px_rgba(74,222,128,0.6)]",  chip: "bg-[#4ade80]/10 text-[#4ade80]" },
  violet: { text: "text-[#a78bfa]", ring: "hover:border-[#a78bfa]/50", dot: "bg-[#a78bfa]",   glow: "shadow-[0_0_40px_-8px_rgba(167,139,250,0.6)]", chip: "bg-[#a78bfa]/10 text-[#a78bfa]" },
  cyan:   { text: "text-[#67e8f9]", ring: "hover:border-[#67e8f9]/50", dot: "bg-[#67e8f9]",   glow: "shadow-[0_0_40px_-8px_rgba(103,232,249,0.6)]", chip: "bg-[#67e8f9]/10 text-[#67e8f9]" },
  amber:  { text: "text-[#fbbf24]", ring: "hover:border-[#fbbf24]/50", dot: "bg-[#fbbf24]",   glow: "shadow-[0_0_40px_-8px_rgba(251,191,36,0.5)]",  chip: "bg-[#fbbf24]/10 text-[#fbbf24]" },
};

function Index() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a16] font-sans text-white antialiased relative overflow-hidden">
      {/* Global aurora background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] h-[55%] w-[55%] rounded-full bg-[#4ade80]/10 blur-[140px] animate-aurora-slow" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[55%] w-[55%] rounded-full bg-[#a78bfa]/12 blur-[140px] animate-aurora-slow-alt" />
        <div className="absolute top-[35%] left-[40%] h-[35%] w-[35%] rounded-full bg-[#67e8f9]/8 blur-[120px] animate-aurora-drift" />
      </div>

      <div className="relative z-10">
        <TrialBanner />
        <TopNav />
        <main className="mx-auto max-w-7xl px-6 pb-24 pt-4 md:px-10 md:pb-32">
          <HeroBento />
          <IntelligenceStrip />
          <TrustMarquee />
          <Pricing />
          <FinalCTA />
        </main>

        <Footer />
      </div>

      <style>{`
        @keyframes aurora-slow { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4%, 6%) scale(1.1); } }
        @keyframes aurora-slow-alt { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-4%, -3%) scale(1.08); } }
        @keyframes aurora-drift { 0%,100% { transform: translate(-10%, 0) scale(1); } 50% { transform: translate(10%, -8%) scale(1.15); } }
        .animate-aurora-slow { animation: aurora-slow 22s ease-in-out infinite; }
        .animate-aurora-slow-alt { animation: aurora-slow-alt 26s ease-in-out infinite; }
        .animate-aurora-drift { animation: aurora-drift 30s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function TrialBanner() {
  return (
    <div className="relative z-40 border-b border-[#4ade80]/25 bg-gradient-to-r from-[#4ade80]/15 via-[#a78bfa]/15 to-[#4ade80]/15 backdrop-blur-xl">
      <Link
        to="/auth"
        search={{ mode: "signup", trial: "1" }}
        className="group mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-2.5 md:gap-4 md:py-3 text-center"
        style={{ fontFamily: "'League Spartan', sans-serif" }}
      >
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#4ade80] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#0a0a16]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a16] animate-pulse" />
          New
        </span>
        <span className="text-xs md:text-sm font-semibold text-white/95">
          <span className="text-[#4ade80] font-bold">7-day free trial</span>
          <span className="mx-2 text-white/40">·</span>
          <span>1 free assessment across any GEM.IQ</span>
          <span className="mx-2 text-white/40">·</span>
          <span className="text-white/70">Cancel anytime</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold text-white group-hover:bg-white group-hover:text-[#0a0a16] transition-colors">
          Start 7-day free trial
          <ArrowIcon className="h-3 w-3" />
        </span>
      </Link>
    </div>
  );
}

function TopNav() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a16]/70 border-b border-white/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="flex items-center gap-3 group" aria-label="GEM.IQ Hub — home">
          <img src={gemLogo.url} alt="GEM" className="h-9 w-auto transition-opacity group-hover:opacity-80" />
          <span className="hidden h-6 w-px bg-white/15 sm:block" />
          <span className="font-display text-2xl font-bold tracking-tight">
            GEM.IQ <span className="text-[#05CFAB]">Hub</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <a href="#assessments" className="hidden md:inline px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
            Assessments
          </a>
          <a href="#pricing" className="hidden md:inline px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
            Pricing
          </a>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="px-4 py-2 text-sm font-semibold tracking-wide text-white/80 hover:text-white transition-colors"
            style={{ fontFamily: "'League Spartan', sans-serif" }}
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="px-5 py-2 text-sm font-bold tracking-wide bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all backdrop-blur-md"
            style={{ fontFamily: "'League Spartan', sans-serif" }}
          >
            Create account
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroBento() {
  return (
    <section id="assessments" className="pt-10 md:pt-14">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:auto-rows-[minmax(180px,auto)]">
        {/* Full-width hero */}
        <HeroTile />

        {/* 4 assessment tiles */}
        {ASSESSMENTS.map((a) => (
          <AssessmentTile key={a.key} a={a} />
        ))}


        {/* Methodology strip */}
        <MethodologyTile />
        <BenchmarkTile />
      </div>
    </section>
  );
}

function HeroTile() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % ASSESSMENTS.length), 3200);
    return () => clearInterval(t);
  }, []);
  const current = ASSESSMENTS[i];
  const accent = ACCENT[current.accent];

  return (
    <div className="md:col-span-4 relative overflow-hidden p-0 md:p-0 flex flex-col justify-between min-h-[420px] md:min-h-[440px]">
      {/* Background futuristic AI video */}
      <video
        aria-hidden
        autoPlay
        loop
        muted
        playsInline
        poster={themeTariff}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen"
      >
        <source src={heroVideo.url} type="video/mp4" />
      </video>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#0a0a16]/85 via-[#0a0a16]/60 to-[#16213e]/70" />
      {/* Ambient glow */}
      <div aria-hidden className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-[#4ade80]/20 to-[#a78bfa]/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-[#a78bfa]/10 blur-3xl" />


      <div className="relative z-10 flex items-start justify-between">
        <span
          className="text-[#4ade80] text-xs font-bold uppercase tracking-[0.25em]"
          style={{ fontFamily: "'League Spartan', sans-serif" }}
        >
          Intelligence Suite · 4 Assessments
        </span>
        <div className="hidden md:flex items-center gap-2">
          {ASSESSMENTS.map((a, idx) => (
            <button
              key={a.key}
              onClick={() => setI(idx)}
              aria-label={`Show ${a.name}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-8 bg-white" : "w-4 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-2xl">
        <h1
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight"
          style={{ fontFamily: "'League Spartan', sans-serif" }}
        >
          GEM.IQ Hub — Unified executive assessments for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#a78bfa]">
            global readiness.
          </span>
        </h1>
        <p className="mt-5 text-base md:text-lg text-white/60 max-w-xl leading-relaxed">
          GEM.IQ Hub centralizes identity, billing, and results across every executive assessment — so
          your team benchmarks trade, market entry, digital, and delivery from a single view.
        </p>

        {/* Rotating showcase */}
        <div key={current.key} className="mt-8 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className={`h-10 w-10 shrink-0 rounded-xl border border-white/10 flex items-center justify-center ${accent.chip}`}>
            <span className={`h-2 w-2 rounded-full ${accent.dot} shadow-[0_0_12px_currentColor]`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40" style={{ fontFamily: "'League Spartan', sans-serif" }}>
              Now featuring
            </div>
            <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
              <span className={`font-display text-xl font-bold ${accent.text}`} style={{ fontFamily: "'League Spartan', sans-serif" }}>
                {current.name}
              </span>
              <span className="text-sm text-white/60">— {current.domain}</span>
            </div>
          </div>
        </div>




        {/* Trial offer card — primary CTA */}
        <div className="mt-8 rounded-2xl border border-[#4ade80]/40 bg-gradient-to-br from-[#4ade80]/12 via-[#0a0a16]/40 to-[#a78bfa]/10 backdrop-blur-xl p-5 md:p-6 shadow-[0_0_50px_-12px_rgba(74,222,128,0.35)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4ade80] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#0a0a16]" style={{ fontFamily: "'League Spartan', sans-serif" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a16] animate-pulse" />
              Limited launch offer
            </span>
          </div>
          <div className="mt-3 font-display text-2xl md:text-3xl font-bold leading-tight tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
            Try any GEM.IQ <span className="text-[#4ade80]">free for 7 days.</span>
          </div>
          <p className="mt-1.5 text-sm text-white/70">
            Includes <strong className="text-white">1 complete assessment</strong> across any discipline — TariffIQ, ReadinessIQ, UXIQ, or TechServicesIQ. Full dimension-level report yours to keep, forever.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup", trial: "1" }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4ade80] to-[#a78bfa] px-6 py-3 text-sm font-bold text-[#0a0a16] shadow-[0_0_30px_-6px_rgba(167,139,250,0.6)] hover:shadow-[0_0_40px_-4px_rgba(74,222,128,0.7)] transition-shadow"
              style={{ fontFamily: "'League Spartan', sans-serif" }}
            >
              Start 7-day free trial
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              style={{ fontFamily: "'League Spartan', sans-serif" }}
            >
              Or subscribe directly
            </Link>
            <span className="text-[11px] text-white/50">
              Card required · Auto-converts on day 7 · Cancel anytime
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, durationMs = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

function IntelligenceStrip() {
  const [visible, setVisible] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.25 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setImgIdx((p) => (p + 1) % ASSESSMENTS.length), 3800);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { label: "Assessment dimensions", target: 42, suffix: "+", accent: "text-[#4ade80]" },
    { label: "Global markets analyzed", target: 180, suffix: "", accent: "text-[#a78bfa]" },
    { label: "Executive benchmarks", target: 2600, suffix: "+", accent: "text-[#67e8f9]" },
    { label: "Median time to insight", target: 9, suffix: " min", accent: "text-[#4ade80]" },
  ];

  return (
    <section ref={ref} className="mt-20 md:mt-28">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Rotating photo banner */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl bg-[#16213e]/30 ring-1 ring-inset ring-white/[0.06] min-h-[360px] md:min-h-[440px]">
          {ASSESSMENTS.map((a, idx) => (
            <img
              key={a.key}
              src={a.image}
              alt={`${a.name} — ${a.domain}`}
              loading="lazy"
              width={1280}
              height={800}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                idx === imgIdx ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0a16] via-[#0a0a16]/50 to-transparent" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0a0a16]/70 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80" style={{ fontFamily: "'League Spartan', sans-serif" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                Live intelligence
              </span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50" style={{ fontFamily: "'League Spartan', sans-serif" }}>
                {ASSESSMENTS[imgIdx].domain}
              </div>
              <h3 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
                {ASSESSMENTS[imgIdx].name}
              </h3>
              <p className="mt-2 text-sm md:text-base text-white/70 max-w-md">
                {ASSESSMENTS[imgIdx].tagline}
              </p>
              <div className="mt-5 flex items-center gap-2">
                {ASSESSMENTS.map((a, idx) => (
                  <button
                    key={a.key}
                    onClick={() => setImgIdx(idx)}
                    aria-label={`Show ${a.name}`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === imgIdx ? "w-10 bg-white" : "w-4 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats + rotating globe */}
        <div className="lg:col-span-2 grid gap-6">
          <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] p-6 md:p-8">
            <div aria-hidden className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#4ade80]/15 blur-3xl" />
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50" style={{ fontFamily: "'League Spartan', sans-serif" }}>
              GEM.IQ · By the numbers
            </div>
            <div className="mt-5 grid grid-cols-2 gap-5">
              {stats.map((s) => (
                <StatCounter key={s.label} target={s.target} suffix={s.suffix} label={s.label} accent={s.accent} start={visible} />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a16] to-[#16213e]/60 ring-1 ring-inset ring-white/[0.06] p-6 md:p-8 min-h-[180px] flex items-center gap-6">
            <div className="relative shrink-0 h-28 w-28">
              <div aria-hidden className="absolute inset-0 rounded-full border border-[#4ade80]/40 animate-[spin_18s_linear_infinite]" />
              <div aria-hidden className="absolute inset-2 rounded-full border border-[#a78bfa]/40 animate-[spin_24s_linear_infinite_reverse]" />
              <div aria-hidden className="absolute inset-4 rounded-full border border-[#67e8f9]/30 animate-[spin_30s_linear_infinite]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#4ade80]/30 via-[#a78bfa]/30 to-[#67e8f9]/30 blur-md" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-9 w-9 text-white/90" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <ellipse cx="12" cy="12" rx="9" ry="4" />
                  <path d="M3 12h18M12 3v18" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#4ade80]" style={{ fontFamily: "'League Spartan', sans-serif" }}>
                One planet, one platform
              </div>
              <h4 className="mt-1 font-display text-xl md:text-2xl font-bold tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
                Benchmark against global peers.
              </h4>
              <p className="mt-1 text-sm text-white/60">
                Country, industry, and stage-weighted percentiles — updated continuously.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCounter({
  target,
  suffix,
  label,
  accent,
  start,
}: {
  target: number;
  suffix: string;
  label: string;
  accent: string;
  start: boolean;
}) {
  const v = useCountUp(target, 1800, start);
  const display = target >= 100 ? Math.round(v).toLocaleString() : v.toFixed(target < 20 ? 0 : 0);
  return (
    <div>
      <div className={`font-display text-3xl md:text-4xl font-bold tracking-tight ${accent}`} style={{ fontFamily: "'League Spartan', sans-serif" }}>
        {display}
        <span className="text-white/70">{suffix}</span>
      </div>
      <div className="mt-1 text-xs text-white/55 leading-snug">{label}</div>
    </div>
  );
}



function FeatureTile({
  badge,
  title,
  body,
  accent,
}: {
  badge: string;
  title: string;
  body: string;
  accent: Accent;
}) {
  const c = ACCENT[accent];
  return (
    <div className="md:col-span-1 md:row-span-1 relative overflow-hidden rounded-3xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] p-6 flex flex-col justify-between hover:bg-white/[0.08] transition-colors">
      <div aria-hidden className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full ${c.dot} opacity-20 blur-3xl`} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${c.chip}`} style={{ fontFamily: "'League Spartan', sans-serif" }}>
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
          {badge}
        </div>
        <FeatureDiagram accent={accent} kind={title.toLowerCase().includes("identity") ? "identity" : "speed"} />
      </div>

      <div className="relative z-10">
        <h3 className="font-display text-3xl md:text-4xl font-bold leading-[0.95] tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          {title}
        </h3>
        <p className="mt-3 text-[15px] text-white/65 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function FeatureDiagram({ accent, kind }: { accent: Accent; kind: "identity" | "speed" }) {
  const stroke =
    accent === "mint" ? "#4ade80" : accent === "violet" ? "#a78bfa" : accent === "cyan" ? "#67e8f9" : "#fca5a5";
  if (kind === "identity") {
    return (
      <svg viewBox="0 0 80 60" className="h-14 w-20 opacity-80" fill="none" stroke={stroke} strokeWidth="1.25">
        <circle cx="40" cy="30" r="7" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="68" cy="12" r="4" />
        <circle cx="12" cy="48" r="4" />
        <circle cx="68" cy="48" r="4" />
        <path d="M16 14L34 27M64 14L46 27M16 46L34 33M64 46L46 33" opacity="0.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 60" className="h-14 w-20 opacity-80" fill="none" stroke={stroke} strokeWidth="1.25">
      <circle cx="40" cy="30" r="22" opacity="0.35" />
      <path d="M40 12 A18 18 0 0 1 58 30" strokeWidth="2" />
      <path d="M40 30 L40 18" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 30 L50 34" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="30" r="1.8" fill={stroke} />
    </svg>
  );
}


function AssessmentTile({ a }: { a: Assessment }) {
  const c = ACCENT[a.accent];
  const Wrapper: any = a.live ? "a" : "div";
  const wrapperProps = a.live ? { href: a.url, target: "_blank", rel: "noreferrer" } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`md:col-span-1 group relative rounded-3xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] p-6 flex flex-col justify-between overflow-hidden transition-all ${c.ring} ${
        a.live ? "cursor-pointer hover:-translate-y-0.5" : "opacity-90"
      }`}
    >
      {/* Corner glow on hover */}
      <div aria-hidden className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full ${c.dot} opacity-0 blur-3xl group-hover:opacity-20 transition-opacity`} />

      <div className="relative z-10 flex items-start justify-between">
        <div className={`h-11 w-11 rounded-2xl border border-white/10 flex items-center justify-center ${c.chip}`}>
          <AssessmentGlyph accent={a.accent} />
        </div>
        {!a.live ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Soon
          </span>
        ) : (
          <ArrowIcon className={`h-5 w-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all`} />
        )}
      </div>

      <div className="relative z-10 mt-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          {a.domain}
        </div>
        <h3
          className={`mt-1 font-display text-2xl font-bold tracking-tight group-hover:${c.text.replace("text-", "text-")} transition-colors`}
          style={{ fontFamily: "'League Spartan', sans-serif" }}
        >
          {a.name}
        </h3>
        <p className={`mt-1 text-sm font-medium ${c.text}`}>{a.tagline}</p>
        <p className="mt-3 text-sm text-white/55 leading-relaxed line-clamp-3">{a.body}</p>
      </div>
    </Wrapper>
  );
}

function AssessmentGlyph({ accent }: { accent: Accent }) {
  const c = ACCENT[accent];
  const stroke = accent === "mint" ? "#4ade80" : accent === "violet" ? "#a78bfa" : accent === "cyan" ? "#67e8f9" : "#fbbf24";
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
    </svg>
  );
}

function MethodologyTile() {
  return (
    <div className="md:col-span-2 md:row-span-1 rounded-3xl bg-gradient-to-br from-[#16213e]/60 to-[#0a0a16]/40 backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
      <div className="shrink-0 h-14 w-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#4ade80]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />
        </svg>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          Executive-grade methodologies
        </div>
        <h3 className="mt-1 font-display text-2xl font-bold tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          CMMI · TRL/MRL · WCAG · Tariff engineering doctrine
        </h3>
        <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-2xl">
          Every IQ is built on a peer-reviewed framework — so scores map to language your board already speaks.
        </p>
      </div>
    </div>
  );
}

function BenchmarkTile() {
  return (
    <div className="md:col-span-2 md:row-span-1 rounded-3xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] p-8 relative overflow-hidden">
      <div aria-hidden className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#a78bfa]/15 blur-3xl" />
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a78bfa]" style={{ fontFamily: "'League Spartan', sans-serif" }}>
            Unified benchmarking
          </div>
          <h3 className="mt-1 font-display text-2xl font-bold tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
            One dashboard. Every dimension.
          </h3>
          <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-md">
            Compare your organization across assessments, retakes, and industry peers — all from one view.
          </p>
        </div>
        {/* Mini spark bars */}
        <div className="hidden sm:flex items-end gap-1.5 h-16">
          {[38, 62, 51, 78, 44, 82, 66, 90].map((h, idx) => (
            <div
              key={idx}
              className="w-2 rounded-t bg-gradient-to-t from-[#4ade80]/40 to-[#a78bfa]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustMarquee() {
  const items = [
    "GoToMarket Strategy",
    "Tariff Engineering",
    "AI Experience",
    "Enterprise Sales",
    "Digital Accessibility",
    "Services Delivery",
    "Market Entry",
    "Product Maturity",
  ];
  return (
    <section className="mt-16 border-y border-white/5 py-6 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap gap-12">
        {[...items, ...items].map((it, i) => (
          <span key={i} className="text-sm uppercase tracking-[0.25em] text-white/40" style={{ fontFamily: "'League Spartan', sans-serif" }}>
            <span className="mr-3 inline-block h-1.5 w-1.5 rounded-full bg-[#4ade80] align-middle" />
            {it}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
      `}</style>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mt-20 md:mt-28">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
          Pricing
        </div>
        <h2 className="mt-6 font-display text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          One subscription. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#a78bfa]">Every assessment.</span>
        </h2>
        <p className="mt-4 text-white/55">
          GEM.IQ Professional unlocks unlimited access, retake history, and executive-ready benchmarking across every IQ.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
        <PricingCard plan="Monthly" price="$99" unit="/ month" planKey="monthly" note="Cancel anytime from the billing portal." />
        <PricingCard plan="Annual" price="$990" unit="/ year" planKey="annual" note="Two months on us — best for quarterly benchmarking teams." featured />
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  price,
  unit,
  note,
  planKey,
  featured,
}: {
  plan: string;
  price: string;
  unit: string;
  note: string;
  planKey: "monthly" | "annual";
  featured?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-8 backdrop-blur-xl flex flex-col ${
        featured
          ? "border-[#4ade80]/40 bg-gradient-to-br from-[#16213e]/80 to-[#0a0a16]/60 shadow-[0_0_50px_-12px_rgba(74,222,128,0.35)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      {featured && (
        <div aria-hidden className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#4ade80]/20 blur-3xl" />
      )}
      <div className="relative z-10 flex items-center justify-between">
        <div className="font-display text-xl font-bold" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          {plan}
        </div>
        {featured && (
          <span className="rounded-full bg-[#4ade80] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0a0a16]" style={{ fontFamily: "'League Spartan', sans-serif" }}>
            Best value
          </span>
        )}
      </div>
      <div className="relative z-10 mt-6 flex items-baseline gap-2">
        <div className="font-display text-5xl font-bold" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          {price}
        </div>
        <div className="text-white/50">{unit}</div>
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-2 rounded-lg border border-[#4ade80]/40 bg-[#4ade80]/10 px-3 py-2">
        <svg className="h-4 w-4 shrink-0 text-[#4ade80]" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.7 6.3a1 1 0 00-1.4-1.4L9 10.2 7.7 8.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"/></svg>
        <span className="text-xs font-semibold text-white/90" style={{ fontFamily: "'League Spartan', sans-serif" }}>
          <span className="text-[#4ade80]">7-day free trial</span> with 1 free assessment
        </span>
      </div>
      <ul className="relative z-10 mt-6 space-y-3 text-sm text-white/70">
        {[
          "Unlimited access to every GEM.IQ assessment",
          "Full retake history and score-over-time tracking",
          "Dimension-level benchmarks and executive PDFs",
          "Priority HubSpot sync for your team",
        ].map((line) => (
          <li key={line} className="flex items-start gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#4ade80]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
            </svg>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="relative z-10 mt-auto pt-8 space-y-2">
        <Link
          to="/auth"
          search={{ mode: "signup", trial: "1", plan: planKey }}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all ${
            featured
              ? "bg-gradient-to-r from-[#4ade80] to-[#a78bfa] text-[#0a0a16] hover:shadow-[0_0_30px_-6px_rgba(167,139,250,0.7)]"
              : "bg-[#4ade80] text-[#0a0a16] hover:bg-[#4ade80]/90"
          }`}
          style={{ fontFamily: "'League Spartan', sans-serif" }}
        >
          Start 7-day free trial
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <Link
          to="/auth"
          search={{ mode: "signup", plan: planKey }}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all ${
            featured
              ? "border border-white/15 bg-white/5 hover:bg-white/10 text-white"
              : "border border-white/20 bg-white/10 hover:bg-white/20"
          }`}
          style={{ fontFamily: "'League Spartan', sans-serif" }}
        >
          Or subscribe directly
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-xs text-white/40">{note}</p>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="mt-20 md:mt-28">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16213e]/80 via-[#0a0a16] to-[#16213e]/80 ring-1 ring-inset ring-white/[0.06] p-10 md:p-16 text-center">
        <div aria-hidden className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#4ade80]/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#a78bfa]/20 blur-3xl" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'League Spartan', sans-serif" }}>
            Ready to quantify your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#a78bfa]">global readiness?</span>
          </h2>
          <p className="mt-4 text-white/60">
            Sign up once. Take any assessment in under 10 minutes. Get executive-ready benchmarks in your inbox.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4ade80] to-[#a78bfa] px-7 py-3.5 text-sm font-bold text-[#0a0a16] shadow-[0_0_30px_-6px_rgba(167,139,250,0.6)]"
              style={{ fontFamily: "'League Spartan', sans-serif" }}
            >
              Create your account
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              style={{ fontFamily: "'League Spartan', sans-serif" }}
            >
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 mt-8 py-10 text-white/60">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={gemLogo.url} alt="GEM" className="h-8 w-auto opacity-90" />
            <span className="font-display text-lg font-bold" style={{ fontFamily: "'League Spartan', sans-serif" }}>
              GEM.IQ Hub
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-white/40">
            <a href="mailto:info@globaledgemarkets.com" className="hover:text-white">info@globaledgemarkets.com</a>
            <a href="https://globaledgemarkets.com" target="_blank" rel="noreferrer" className="hover:text-white">globaledgemarkets.com</a>
            <span>© {new Date().getFullYear()} GlobalEdgeMarkets</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h12m0 0l-5-5m5 5l-5 5" />
    </svg>
  );
}
