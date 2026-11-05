import { describe, expect, it } from "vitest";
import { IQ_PRODUCTS } from "@/lib/iq-catalog";
import { iqContextFromReturnUrl } from "@/lib/hub/iq-context";
import manifest from "@/lib/hub/manifest.json";
import { AUDIT_SITES } from "@/lib/posthog-audit.server";

describe("UXIQ canonical address", () => {
  it("launches UXIQ at its live domain from both catalogs", () => {
    expect(IQ_PRODUCTS.find(p => p.key === "uxiq")?.url).toBe("https://uxiq.globaledgemarkets.com");
    expect(manifest.assessments.find(p => p.key === "uxiq")?.url).toBe("https://uxiq.globaledgemarkets.com");
  });

  it("recognizes UXIQ when signing in for the live domain", () => {
    expect(iqContextFromReturnUrl("https://uxiq.globaledgemarkets.com/resume")?.key).toBe("uxiq");
  });

  it("audits PostHog events on the live UXIQ domain", () => {
    expect(AUDIT_SITES.uxiq).toBe("uxiq.globaledgemarkets.com");
  });
});