import { describe, expect, it } from "vitest";
import { allowedReturnHosts, checkReturnUrl } from "@/lib/return-url";

const apps = [
  { site_url: "https://productiq.globaledgemarkets.com", lifecycle: "live" },
  { site_url: "https://uxiq.globaledgemarkets.com", lifecycle: "live" },
  { site_url: "https://oldiq.globaledgemarkets.com", lifecycle: "retired" },
];
const hosts = allowedReturnHosts(apps);
const IQ = "https://productiq.globaledgemarkets.com/assessment?x=1";

describe("return address check", () => {
  it("accepts a live IQ site from the registry", () => expect(checkReturnUrl(IQ, hosts)).toBe(IQ));
  it("accepts the Hub's own host", () => expect(checkReturnUrl("https://gemiq.globaledgemarkets.com/dashboard", hosts)).toBe("https://gemiq.globaledgemarkets.com/dashboard"));
  it("rejects evil.com", () => expect(checkReturnUrl("https://evil.com/", hosts)).toBeNull());
  it("rejects a random lovable.app address", () => expect(checkReturnUrl("https://random-app.lovable.app/", hosts)).toBeNull());
  it("rejects an unlisted globaledgemarkets.com subdomain", () => expect(checkReturnUrl("https://other.globaledgemarkets.com/", hosts)).toBeNull());
  it("rejects a retired app's host", () => expect(checkReturnUrl("https://oldiq.globaledgemarkets.com/", hosts)).toBeNull());
  it("rejects http", () => expect(checkReturnUrl("http://productiq.globaledgemarkets.com/", hosts)).toBeNull());
  it("rejected → caller lands on dashboard", () => expect(checkReturnUrl("https://evil.com/", hosts) ?? "/dashboard").toBe("/dashboard"));
});

import { isCheckoutAddressAllowed } from "@/lib/return-url";
describe("checkout success/cancel addresses", () => {
  const h = allowedReturnHosts([
    { site_url: "https://tariffiq.globaledgemarkets.com", lifecycle: "live" },
    { site_url: "https://oldiq.globaledgemarkets.com", lifecycle: "retired" },
  ]);
  for (const ok of [
    "https://tariffiq.globaledgemarkets.com/resume?sid=abc",       // trial start + single purchase success
    "https://tariffiq.globaledgemarkets.com/intake",               // cancel
    "https://tariffiq.globaledgemarkets.com/results/123",          // unlock success/cancel
    "https://gemiq.globaledgemarkets.com/checkout/return?to=x",    // Hub's own flow
  ]) it(`accepts ${ok}`, () => expect(isCheckoutAddressAllowed(ok, h)).toBe(true));
  for (const bad of [
    "https://evil.com/",
    "https://random-app.lovable.app/",
    "https://other.globaledgemarkets.com/",
    "https://oldiq.globaledgemarkets.com/",
    "http://tariffiq.globaledgemarkets.com/resume",
  ]) it(`refuses ${bad}`, () => expect(isCheckoutAddressAllowed(bad, h)).toBe(false));
});
