import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ReportPreview } from "@/components/iq/ReportPreview";
import { ACCENT, IQ_PRODUCTS } from "@/lib/iq-catalog";

const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

/** Home-page showcase: pick an IQ, see its sample report (score ring, bars, spiderweb). */
export function SampleReportShowcase() {
  const [active, setActive] = useState(0);
  const product = IQ_PRODUCTS[active];
  const color = ACCENT[product.accent].hex;

  return (
    <section id="reports" className="mt-20 md:mt-28">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40" style={DISPLAY}>
            What you get back
          </div>
          <h2 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl" style={DISPLAY}>
            Every assessment returns a scored, benchmarked report
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            A composite maturity score, a tier your board understands, dimension-level bars, and a spiderweb
            profile plotted against the peer median. Switch between assessments to see the shape of each one.
          </p>
        </div>
        <Link
          to={product.path as "/tariffiq"}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          style={DISPLAY}
        >
          Explore {product.name}
        </Link>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {IQ_PRODUCTS.map((p, i) => {
          const a = ACCENT[p.accent];
          const on = i === active;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ring-1 ring-inset transition-colors ${
                on ? `${a.chip} ring-white/15` : "bg-white/[0.04] text-white/55 ring-white/[0.06] hover:text-white"
              }`}
              style={DISPLAY}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <ReportPreview product={product} color={color} />
      </div>
    </section>
  );
}
