// Maps a return-to URL back to the IQ that sent the user here, so /auth
// can show contextual copy ("Create your GEM.IQ account to start TariffIQ")
// instead of a bare "Sign in to continue".
//
// The host map is DERIVED from IQ_PRODUCTS (src/lib/iq-catalog.ts) — keyed off
// the hostname of each product's canonical `url` — so it can never drift from
// the catalog again. Do not hand-maintain a parallel list here.

import { IQ_PRODUCTS } from "@/lib/iq-catalog";
import manifest from "@/lib/hub/manifest.json";
import { planFor, money } from "@/lib/pricing";

export interface IqContext {
  key: string;
  name: string;
  tagline: string;
  /** Human-readable price line shown on signup. */
  priceLine: string;
  /** True for hosts kept only so legacy bounces still get sane copy. */
  legacy?: boolean;
}

/**
 * One shared price line, derived from the manifest's default (quarterly) plan.
 * Degrades to a price-free line rather than throwing if the manifest ships no plans.
 */
const DEFAULT_PLAN = planFor("quarter");
const TRIAL = manifest.pricing.trial?.days;

const PRICE_LINE = DEFAULT_PLAN
  ? `${money(DEFAULT_PLAN.amount)}/${DEFAULT_PLAN.interval} — ${TRIAL ?? 7}-day trial, cancel anytime.`
  : `${TRIAL ?? 7}-day trial, cancel anytime.`;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const IQS: Record<string, IqContext> = Object.fromEntries(
  IQ_PRODUCTS.map((p) => [
    hostOf(p.url),
    { key: p.key, name: p.name, tagline: p.tagline, priceLine: PRICE_LINE },
  ]).filter(([host]) => host),
);

// Retired-legacy: ReadinessIQ was broken up into GTMIQ/SalesIQ/ProductIQ/
// AITransformIQ. Its host 301s to /dashboard, but keep a fallback in case a
// stale deep link still bounces a user here.
IQS["readinessiq.globaledgemarkets.com"] = {
  key: "readinessiq",
  name: "GEM.IQ",
  tagline: "ReadinessIQ is now GTMIQ, SalesIQ, ProductIQ, and AITransformIQ.",
  priceLine: PRICE_LINE,
  legacy: true,
};

export function iqContextFromReturnUrl(raw: string | undefined | null): IqContext | null {
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return IQS[host] ?? null;
  } catch {
    return null;
  }
}
