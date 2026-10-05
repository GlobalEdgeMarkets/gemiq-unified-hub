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
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground" style={DISPLAY}>
            What you get back
          </div>
          <h2 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl" style={DISPLAY}>
            Every assessment returns a scored, benchmarked report
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            A composite maturity score, a tier your board understands, dimension-level bars, and a spiderweb
            profile plotted against the peer median. Switch between assessments to see the shape of each one.
          </p>
        </div>
        <Link
          to={product.path as "/tariffiq"}
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
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
                on ? `${a.chip} ring-border` : "bg-card shadow-sm text-foreground/80 ring-border hover:text-foreground"
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
