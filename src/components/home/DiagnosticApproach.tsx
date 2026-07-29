const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

const ROWS: { label: string; single: string; gem: string }[] = [
  {
    label: "What it measures",
    single: "One relationship signal — how people feel",
    gem: "A weighted, multidimensional map of what actually drives the outcome",
  },
  {
    label: "Design intent",
    single: "Reduce, to hide complexity",
    gem: "Decompose, to expose complexity",
  },
  {
    label: "When it runs",
    single: "Repeatedly, to track sentiment over time",
    gem: "At the decision point, before capital and reputation are committed",
  },
  {
    label: "The output",
    single: "A single number you can hold in your head",
    gem: "A tiered score plus a gap map that routes to a specific fix",
  },
  {
    label: "The role it plays",
    single: "A thermometer you keep reading",
    gem: "An X-ray you take at the door",
  },
];

const DEFENSIBILITY: { t: string; d: string }[] = [
  {
    t: "Dimensions are independent",
    d: "Each one maps to a real driver of the outcome — a deliberately higher bar than any single-question index has to clear.",
  },
  {
    t: "Weights are stated, not disguised",
    d: "Expert-derived today from encoded GEM consulting judgment, recalibrated empirically as completion volume grows. We say which is which.",
  },
  {
    t: "Tier bands are provisional and labeled",
    d: "Cut points are operational routing bands, flagged for recalibration once the data shows where real breaks in behavior fall.",
  },
  {
    t: "Benchmarks harden with volume",
    d: "Directional now, sharper every quarter. The data-network effect is the asset — and sparse early data is stated plainly, not dressed up.",
  },
];

export function DiagnosticApproach() {
  return (
    <section id="methodology" className="mt-20 md:mt-28">
      <div className="max-w-3xl">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#4ade80]" style={DISPLAY}>
          The methodology
        </div>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl" style={DISPLAY}>
          One number is a thermometer. A diagnostic is an X-ray.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/65">
          The market learned something important from the single-score era: a memorable number becomes a
          shared language, and a shared language moves boardrooms. That was the right instrument for taking a
          temperature. It is the wrong instrument when the job is deciding whether to enter a market, absorb a
          tariff regime, restructure a go-to-market, or bet the balance sheet on an AI program.
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/65">
          GEM.IQ decomposes instead of reducing. Every assessment scores weighted, independent dimensions and
          returns a gap map — the score is not the product, the map is. That map tells you which weakness is
          load-bearing, what it costs you to leave it alone, and what to do about it first.
        </p>
      </div>

      {/* Contrast table */}
      <div className="mt-10 overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-px bg-white/[0.06] md:grid-cols-[1fr_1.2fr_1.4fr]">
          <div className="bg-[#0a0a16]/60 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40" style={DISPLAY}>
            Dimension
          </div>
          <div className="hidden bg-[#0a0a16]/60 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 md:block" style={DISPLAY}>
            Single-score index
          </div>
          <div className="hidden bg-[#0a0a16]/60 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#4ade80] md:block" style={DISPLAY}>
            GEM.IQ diagnostic
          </div>

          {ROWS.map((r) => (
            <div key={r.label} className="contents">
              <div className="bg-[#0a0a16]/40 px-6 py-5 text-sm font-bold text-white/85" style={DISPLAY}>
                {r.label}
              </div>
              <div className="bg-[#0a0a16]/40 px-6 pb-5 text-sm text-white/50 md:py-5">{r.single}</div>
              <div className="bg-[#0a0a16]/40 px-6 pb-5 text-sm text-white/85 md:py-5">{r.gem}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CANsulting promise */}
      <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl bg-gradient-to-br from-[#4ade80]/12 via-[#0a0a16]/40 to-[#a78bfa]/12 p-8 ring-1 ring-inset ring-white/[0.08]">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40" style={DISPLAY}>
            The approach
          </div>
          <p className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={DISPLAY}>
            CANsulting when you can.{" "}
            <span className="text-[#4ade80]">Consulting when you can&#39;t.</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Diagnose yourself first. GEM.IQ gives you the scored, benchmarked read in about ten minutes —
            no procurement cycle, no discovery deck. When the map surfaces a gap that needs senior hands,
            it routes into a GlobalEdgeMarkets engagement. The diagnostic is the on-ramp to the consulting,
            never a substitute for it.
          </p>
        </div>
        <div className="rounded-3xl bg-white/[0.04] p-8 ring-1 ring-inset ring-white/[0.06]">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a78bfa]" style={DISPLAY}>
            Why executives take it seriously
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            These decisions carry real consequence — market entry, tariff exposure, delivery capacity,
            transformation spend. A diagnostic that informs them has to be honest about its own
            construction. Ours is.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            A defensible score is not one that has nailed every weight. It is one that is transparent about
            what is expert-set versus data-derived — and gets more defensible with every assessment run.
          </p>
        </div>
      </div>

      {/* Defensibility grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEFENSIBILITY.map((d, i) => (
          <div key={d.t} className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-inset ring-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35" style={DISPLAY}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <p className="mt-2 font-display text-base font-bold tracking-tight" style={DISPLAY}>
              {d.t}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{d.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
