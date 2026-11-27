import { describe, expect, it } from "vitest";
import manifest from "@/lib/hub/manifest.json";
import { accountRedirectTarget, wantsBillingPortal } from "@/lib/account-redirect";

describe("Hub dashboard links", () => {
  it("/account forwards to /dashboard", () => {
    expect(accountRedirectTarget("https://gemiq.globaledgemarkets.com/account")).toBe("/dashboard");
  });
  it("/account?x=1 keeps its query", () => {
    expect(accountRedirectTarget("https://gemiq.globaledgemarkets.com/account?x=1")).toBe("/dashboard?x=1");
  });
  it("manifest publishes portal, dashboard and manage_billing", () => {
    const l = manifest.deep_links as Record<string, string>;
    expect(manifest.version).toBe("1.13.0");
    expect(l["portal"]).toBe("https://gemiq.globaledgemarkets.com/dashboard");
    expect(l["dashboard"]).toBe("https://gemiq.globaledgemarkets.com/dashboard");
    expect(l["manage_billing"]).toBe("https://gemiq.globaledgemarkets.com/dashboard?billing=1");
    expect(l["login"]).toBeDefined();
    expect(l["buy_single_assessment"]).toBeDefined();
  });
  it("opens billing only for billing=1", () => {
    expect(wantsBillingPortal("?billing=1")).toBe(true);
    expect(wantsBillingPortal("?billing=0")).toBe(false);
    expect(wantsBillingPortal("")).toBe(false);
  });
});
