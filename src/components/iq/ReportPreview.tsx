import { RadarChart } from "./RadarChart";
import { tierForScore, type IQProduct } from "@/lib/iq-catalog";

const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 110 110" className="h-28 w-28">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="9" />
      <circle
        cx="55"
        cy="55"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${(circ * score) / 100} ${circ}`}
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="58" textAnchor="middle" fill="white" fontSize="26" fontWeight="700" style={DISPLAY}>
        {score}
      </text>
      <text x="55" y="74" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9">
        / 100
      </text>
    </svg>
  );
}

/** Illustrative report preview — mirrors the layout of a real GEM.IQ report. */
export function ReportPreview({ product, color }: { product: IQProduct; color: string }) {
  const tier = tierForScore(product.sampleScore);
  const benchmark = product.sample.map((v) =>
    Math.max(18, Math.min(92, Math.round(v + (product.benchmark - product.sampleScore) + ((v % 7) - 3)))),
  );
  const ranked = product.dimensions
    .map((d, i) => ({ d, v: product.sample[i] }))
    .sort((a, b) => b.v - a.v);

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#16213e]/70 to-[#0a0a16]/60 ring-1 ring-inset ring-white/[0.08]">
      {/* Faux window chrome so it reads as a screenshot */}
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-3 truncate text-[11px] text-white/40">
          {product.name.toLowerCase()} · report / sample-0472
        </span>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
        <div>
          <div className="flex items-center gap-5">
            <ScoreRing score={product.sampleScore} color={color} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40" style={DISPLAY}>
                Composite maturity
              </div>
              <div className="mt-1 text-2xl font-bold capitalize tracking-tight" style={{ ...DISPLAY, color }}>
                {tier}
              </div>
              <p className="mt-1 text-xs text-white/50">
                Peer benchmark {product.benchmark} · {product.dimensions.length} dimensions scored
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            {ranked.map(({ d, v }) => (
              <div key={d}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12.5px] text-white/70">{d}</span>
                  <span className="text-[11px] font-semibold tabular-nums text-white/45">{v}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40" style={DISPLAY}>
            Dimension profile vs. peers
          </div>
          <div className="mt-2">
            <RadarChart labels={product.dimensions} values={product.sample} benchmark={benchmark} color={color} />
          </div>
          <div className="mt-2 flex items-center gap-5 text-[11px] text-white/45">
            <span className="flex items-center gap-2">
              <span className="h-2 w-4 rounded-full" style={{ background: color }} /> Your score
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0 w-4 border-t border-dashed border-white/45" /> Peer median
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] bg-white/[0.02] px-6 py-4 md:px-8">
        <p className="text-[11px] text-white/40">
          Illustrative sample. Live reports use your own responses and are delivered as a shareable link plus PDF.
        </p>
      </div>
    </div>
  );
}
