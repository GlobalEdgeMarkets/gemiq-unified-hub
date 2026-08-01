import { Link } from "@tanstack/react-router";
import gemLogo from "@/assets/gem-logo-light-white-mint.png.asset.json";
import { ReportPreview } from "@/components/iq/ReportPreview";
import { ACCENT, IQ_PRODUCTS, type IQProduct } from "@/lib/iq-catalog";
import { CanRule } from "@/components/CanRule";



function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M17 7H9M17 7v8" />
    </svg>
  );
}

const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

export function IQLanding({ product }: { product: IQProduct }) {
  const c = ACCENT[product.accent];
  const others = IQ_PRODUCTS.filter((p) => p.key !== product.key);

  return (
    <div className="min-h-screen w-full bg-[#0a0a16] font-sans text-white antialiased">
      {/* Nav */}
      <header className="border-b border-white/10 bg-[#0a0a16]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <a
              href="https://globaledgemarkets.com"
              aria-label="GlobalEdgeMarkets — corporate site"
              className="transition-opacity hover:opacity-80"
            >
              <img src={gemLogo.url} alt="GEM" className="h-8 w-auto" />
            </a>
            <span aria-hidden className="h-6 w-px bg-white/20" />
            <Link to="/" aria-label={`GEM.IQ — ${product.name}`}>
              <span className="text-lg font-bold tracking-tight text-white" style={DISPLAY}>
                {product.name}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth" search={{ mode: "signin" }} className="text-sm font-semibold text-white/70 hover:text-white" style={DISPLAY}>
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup", trial: "1" }}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-bold ring-1 ring-inset ring-white/20 backdrop-blur hover:bg-white/20 transition-colors"
              style={DISPLAY}
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={product.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#0a0a16]/90 via-[#0a0a16]/70 to-[#16213e]/70" />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-25"
          style={{ background: c.hex }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50" style={DISPLAY}>
            {product.domain}
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[0.95] tracking-tight md:text-6xl" style={DISPLAY}>
            {product.name} — <span className={c.text}>{product.tagline}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/70 md:text-lg">{product.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup", trial: "1", redirect: product.url }}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#0a0a16] transition-transform hover:-translate-y-0.5"
              style={{ ...DISPLAY, background: c.hex }}
            >
              Start {product.name} free
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              style={DISPLAY}
            >
              Open the assessment
              <ArrowIcon className="h-4 w-4" />
            </a>
            <span className="text-[11px] text-white/50">7-day trial · 1 full assessment · Cancel anytime</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-24 md:px-10 md:pb-32">
        {/* Overview */}
        <section className="mt-16 grid gap-10 md:mt-20 md:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
              Why {product.name} exists
            </h2>
            <div className="mt-5 space-y-5">
              {product.overview.map((para, i) => (
                <p
                  key={para.slice(0, 24)}
                  className={i === 0 ? "text-base leading-relaxed text-white/80 md:text-[17px]" : "text-[15px] leading-relaxed text-white/60"}
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
          <aside className="h-fit rounded-3xl bg-white/[0.04] p-6 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ ...DISPLAY, color: c.hex }}>
              Built for
            </div>
            <ul className="mt-4 space-y-3">
              {product.audience.map((a) => (
                <li key={a} className="flex gap-3 text-sm text-white/75">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.hex }} />
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-white/10 pt-5 text-xs text-white/50">
              ~10 minutes · {product.dimensions.length} scored dimensions · report delivered immediately
            </div>
          </aside>
        </section>

        {/* Sample report */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            Inside the {product.name} report
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            A composite maturity score, every dimension ranked, and a spiderweb profile plotted against the
            peer median — the same layout your own report uses.
          </p>
          <div className="mt-8">
            <ReportPreview product={product} color={c.hex} />
          </div>
        </section>

        {/* Dimensions */}

        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            What {product.name} scores
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Every dimension is scored independently and mapped to the GEM.IQ maturity scale —
            reactive, developing, defined, advanced, optimized.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.dimensions.map((d, i) => (
              <div
                key={d}
                className="group flex items-start gap-3 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl transition-colors hover:bg-white/[0.07]"
              >
                <span
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                  style={{ background: `${c.hex}1a`, color: c.hex }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-white/85">{d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Outcomes */}
        <section className="mt-16 md:mt-20">
          <div className="grid gap-4 md:grid-cols-3">
            {product.outcomes.map((o) => (
              <div key={o} className="rounded-3xl bg-gradient-to-br from-[#16213e]/60 to-[#0a0a16]/40 p-7 ring-1 ring-inset ring-white/[0.06]">
                <div className="h-1.5 w-10 rounded-full" style={{ background: c.hex }} />
                <p className="mt-4 text-lg font-bold leading-snug tracking-tight" style={DISPLAY}>
                  {o}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { t: "Create your GEM.IQ account", d: "One identity across every assessment in the suite." },
              { t: `Run ${product.name}`, d: "Around 10 minutes, executive-level questions, no prep required." },
              { t: "Get your tiered report", d: "Dimension scores, maturity tier, and prioritized actions." },
              { t: "Compare across the suite", d: "Your Hub dashboard rolls every IQ into one composite view." },
            ].map((s, i) => (
              <div key={s.t} className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-inset ring-white/[0.06]">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ ...DISPLAY, color: c.hex }}>
                  Step {i + 1}
                </div>
                <p className="mt-2 text-base font-bold tracking-tight" style={DISPLAY}>{s.t}</p>
                <p className="mt-1.5 text-sm text-white/60">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cross-sell */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={DISPLAY}>
            The rest of the suite
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => {
              const oc = ACCENT[p.accent];
              return (
                <Link
                  key={p.key}
                  to={p.path}
                  className="group rounded-3xl bg-white/[0.04] p-6 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40" style={DISPLAY}>
                    {p.domain}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight" style={DISPLAY}>{p.name}</h3>
                    <ArrowIcon className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                  <p className={`mt-1 text-sm font-medium ${oc.text}`}>{p.tagline}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <CanRule seed={product.key} className="mt-16 md:mt-24" accentHex={c.hex} />

        {/* CTA */}
        <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#16213e]/70 to-[#0a0a16]/50 p-8 text-center ring-1 ring-inset ring-white/[0.06] md:p-14">


          <h2 className="text-2xl font-bold tracking-tight md:text-4xl" style={DISPLAY}>
            Start {product.name} free for 7 days.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/65">
            One GEM.IQ subscription unlocks every assessment in the suite and a unified dashboard of your results.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup", trial: "1", redirect: product.url }}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#0a0a16]"
              style={{ ...DISPLAY, background: c.hex }}
            >
              Start free trial
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              style={DISPLAY}
            >
              Back to the Hub
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-white/45 md:flex-row md:px-10">
          <span>© {new Date().getFullYear()} GlobalEdgeMarkets · GEM.IQ</span>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-white">Hub</Link>
            <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link to="/docs" className="hover:text-white">Developer docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function iqHead(product: IQProduct) {
  const title = `${product.name} — ${product.tagline} | GEM.IQ`;
  const description = product.intro.slice(0, 155);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `https://gemiq.globaledgemarkets.com${product.path}` }],
  };
}
