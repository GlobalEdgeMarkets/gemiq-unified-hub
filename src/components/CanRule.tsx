import { CANONICAL_SLOGAN, sloganFor, type Slogan } from "@/lib/cansulting";

const DISPLAY = { fontFamily: "'League Spartan', sans-serif" } as const;

type Props = {
  /** Deterministic seed (e.g. route key). Omit to use the canonical line. */
  seed?: string;
  slogan?: Slogan;
  variant?: "band" | "inline";
  accentHex?: string;
  className?: string;
};

/**
 * CANsulting slogan rule — a slogan layer, never a product name.
 */
export function CanRule({
  seed,
  slogan,
  variant = "band",
  accentHex = "#4ade80",
  className = "",
}: Props) {
  const s = slogan ?? (seed ? sloganFor(seed) : CANONICAL_SLOGAN);

  if (variant === "inline") {
    return (
      <p className={`text-sm text-white/55 ${className}`}>
        <span className="font-semibold text-white/80" style={DISPLAY}>
          {s.lead}
        </span>{" "}
        <span className="font-semibold" style={{ ...DISPLAY, color: accentHex }}>
          {s.accent}
        </span>{" "}
        <span className="text-white/45">{s.sub}</span>
      </p>
    );
  }

  return (
    <div
      className={`rounded-3xl bg-white/[0.04] px-6 py-6 text-center ring-1 ring-inset ring-white/[0.06] md:px-10 ${className}`}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35"
        style={DISPLAY}
      >
        The promise
      </div>
      <p
        className="mt-2 font-display text-xl font-bold leading-tight tracking-tight md:text-2xl"
        style={DISPLAY}
      >
        {s.lead} <span style={{ color: accentHex }}>{s.accent}</span>
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">{s.sub}</p>
    </div>
  );
}
