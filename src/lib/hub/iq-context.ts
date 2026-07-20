// Maps a return-to URL back to the IQ that sent the user here, so /auth
// can show contextual copy ("Create your GEM.IQ account to start TariffIQ")
// instead of a bare "Sign in to continue".

export interface IqContext {
  key: string;
  name: string;
  tagline: string;
  /** Human-readable price line shown on signup. */
  priceLine: string;
}

const IQS: Record<string, IqContext> = {
  "tariffiq.globaledgemarkets.com": {
    key: "tariffiq",
    name: "TariffIQ",
    tagline: "Quantify your tariff exposure and savings.",
    priceLine: "$99/month — cancel anytime.",
  },
  "readinessiq.globaledgemarkets.com": {
    key: "readinessiq",
    name: "ReadinessIQ",
    tagline: "Benchmark your operational readiness.",
    priceLine: "$99/month — cancel anytime.",
  },
  "uxiq.globaledgemarkets.com": {
    key: "uxiq",
    name: "UXIQ",
    tagline: "Measure your digital experience maturity.",
    priceLine: "$99/month — cancel anytime.",
  },
  "techservicesiq.globaledgemarkets.com": {
    key: "techservicesiq",
    name: "TechServicesIQ",
    tagline: "Assess your technology services capability.",
    priceLine: "$99/month — cancel anytime.",
  },
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
