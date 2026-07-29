/**
 * CANsulting — the slogan / promise layer that connects the self-serve
 * diagnostic to GlobalEdgeMarkets' senior consulting engagements.
 *
 * RULES (from the GEM.IQ vs NPS brief):
 *  - CANsulting is a SLOGAN, never a product or platform name.
 *  - It must never read as "consulting in a can" — the diagnostic is the
 *    on-ramp, the human engagement is where a low score sends you.
 *  - The canonical line is always the anchor: "CANsulting when you can.
 *    Consulting when you can't."
 */

export type Slogan = {
  /** The line, split so the second half can be accented. */
  lead: string;
  accent: string;
  /** One-sentence support copy. */
  sub: string;
};

export const CANONICAL_SLOGAN: Slogan = {
  lead: "CANsulting when you can.",
  accent: "Consulting when you can't.",
  sub: "Diagnose yourself first. Bring in senior hands where the map says you need them.",
};

/** The growth-path line — diagnostic first, senior engagement as you scale. */
export const SCALE_SLOGAN: Slogan = {
  lead: "Start with CANsulting.",
  accent: "Scale with consulting.",
  sub: "Diagnose in ten minutes, then bring in senior hands where the map says it pays.",
};

export const CANSULTING_SLOGANS: Slogan[] = [
  CANONICAL_SLOGAN,
  SCALE_SLOGAN,
  {
    lead: "You CAN measure it.",
    accent: "We can fix it with you.",
    sub: "The score tells you where you stand. The engagement moves you.",
  },
  {
    lead: "Self-diagnose in ten minutes.",
    accent: "Escalate when it matters.",
    sub: "No procurement cycle to find out where the gap is.",
  },
  {
    lead: "Know before you spend.",
    accent: "Then spend where it counts.",
    sub: "Every dimension score points at a decision, not a vanity number.",
  },
  {
    lead: "CANsulting is the on-ramp.",
    accent: "Consulting is the road.",
    sub: "The diagnostic never replaces the senior work — it aims it.",
  },
  {
    lead: "A number you can hold.",
    accent: "A map you can act on.",
    sub: "One score to benchmark, weighted dimensions to fix.",
  },
];

/** Deterministic pick so SSR and hydration agree. */
export function sloganFor(seed: string): Slogan {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CANSULTING_SLOGANS[h % CANSULTING_SLOGANS.length];
}
