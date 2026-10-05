import { Link } from "@tanstack/react-router";

const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

const LEVELS = [
  { n: 1, tier: "Reactive", cmmi: "Initial", trl: "TRL 1–3 · MRL 1–3", pct: 20, color: "#fb7185" },
  { n: 2, tier: "Developing", cmmi: "Managed", trl: "TRL 4–5 · MRL 4–5", pct: 40, color: "#fbbf24" },
  { n: 3, tier: "Defined", cmmi: "Defined", trl: "TRL 6–7 · MRL 6–7", pct: 60, color: "#67e8f9" },
  { n: 4, tier: "Advanced", cmmi: "Quantitatively managed", trl: "TRL 8 · MRL 8–9", pct: 80, color: "#60a5fa" },
  { n: 5, tier: "Optimized", cmmi: "Optimizing", trl: "TRL 9 · MRL 10", pct: 100, color: "#4ade80" },
];

/** CMMI × TRL/MRL maturity ladder — the scale every GEM.IQ score maps to. */
export function MaturityLadder() {
  return (
    <section className="mt-20 md:mt-28">
      <div className="grid gap-8 rounded-3xl bg-gradient-to-br from-[#16213e]/60 to-[#0a0a16]/40 p-8 ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_1.35fr] md:p-12">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#05CFAB]" style={DISPLAY}>
            One scale, every discipline
          </div>
          <h2 className="mt-2 text-3xl font-bold leading-[1.08] tracking-tight md:text-4xl" style={DISPLAY}>
            CMMI × TRL/MRL maturity ladder
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Every dimension of every GEM.IQ assessment is scored on the same five tiers, aligned to CMMI
            process maturity and to bands of technology and manufacturing readiness. That is what makes
            scores comparable across trade, product, go-to-market and AI — and comparable quarter over
            quarter.
          </p>
          <Link
            to="/docs/market-entry-maturity-frameworks"
            className="mt-6 inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            style={DISPLAY}
          >
            Read the framework guide
          </Link>
        </div>

        <ol className="space-y-3">
          {LEVELS.map((l) => (
            <li key={l.n} className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.06]">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold"
                  style={{ background: `${l.color}22`, color: l.color, ...DISPLAY }}
                >
                  {l.n}
                </span>
                <span className="text-base font-bold tracking-tight" style={{ ...DISPLAY, color: l.color }}>
                  {l.tier}
                </span>
                <span className="text-xs text-white/45">{l.cmmi}</span>
                <span className="ml-auto text-[11px] tabular-nums text-white/40">{l.trl}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.color }} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
