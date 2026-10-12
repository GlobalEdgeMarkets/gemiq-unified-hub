import { describe, expect, it } from "vitest";
import { effectiveSet, findAvoidTerms, isMessagingOriginAllowed, publicPayload, type MessagingBody } from "@/lib/messaging";

const item = (key: string, scope: MessagingBody["items"][number]["scope"], value: string, status: "approved" | "draft" | "needs_input", order: number) =>
  ({ key, scope, label: key, value, notes: "", status, order, related: null });

const body: MessagingBody = {
  items: [
    item("brand.name", "shared", "Shared name", "approved", 10),
    item("brand.name", "globaledgetalk", "Talk name", "approved", 10),
    item("hero.headline", "globaledgemarkets.com", "Draft headline", "draft", 20),
    item("plan.sprint", "shared", "[from $X]", "needs_input", 30),
    item("practice.2", "shared", "AI", "approved", 50),
    item("practice.1", "shared", "GTM", "approved", 40),
  ],
  vocabulary: [
    { use: "assessment", avoid: ["diagnostic", "diagnostics"], why: "x" },
    { use: "minutes", avoid: ["10 minutes"], why: "y" },
  ],
};

describe("messaging rules", () => {
  it("a property's own item beats the shared one", () => {
    expect(effectiveSet(body, "globaledgetalk").find((i) => i.key === "brand.name")?.value).toBe("Talk name");
    expect(effectiveSet(body, "gemiq").find((i) => i.key === "brand.name")?.value).toBe("Shared name");
  });
  it("public link includes Approved items only", () => {
    const keys = publicPayload(body, "globaledgemarkets.com", 1, null).items.map((i) => i.key);
    expect(keys).not.toContain("hero.headline");
    expect(keys).not.toContain("plan.sprint");
    expect(keys).toContain("brand.name");
  });
  it("items come back in set order", () => {
    const keys = publicPayload(body, "gemiq", 1, null).items.map((i) => i.key);
    expect(keys).toEqual(["brand.name", "practice.1", "practice.2"]);
  });
  it("flags avoid words as whole words", () => {
    expect(findAvoidTerms("Our Diagnostics suite", body.vocabulary).map((h) => h.term)).toEqual(["diagnostics"]);
    expect(findAvoidTerms("Done in 10 minutes", body.vocabulary).map((h) => h.term)).toEqual(["10 minutes"]);
    expect(findAvoidTerms("An assessment", body.vocabulary)).toEqual([]);
  });
  it("CORS allows listed sites and rejects others", () => {
    expect(isMessagingOriginAllowed("https://www.globaledgetalk.live")).toBe(true);
    expect(isMessagingOriginAllowed("https://blog.globaledgemarkets.com")).toBe(true);
    expect(isMessagingOriginAllowed("https://evil.example.com")).toBe(false);
  });
});

import { applyIqCopy, fillPlaceholders } from "@/lib/messaging";
describe("prices and assessment pages", () => {
  it("fills prices from the plan list", () => {
    expect(fillPlaceholders("{price.complete_monthly}/month, {price.single} once, {price.growth_monthly}, {price.complete_annual}")).toBe("$249/month, $179 once, $149, $2,490");
    expect(fillPlaceholders("{price.unknown}")).toBe("{price.unknown}");
  });
  it("assessment page uses approved wording and keeps built-in text otherwise", () => {
    const p = { key: "uxiq", tagline: "Old", domain: "D", body: "B", intro: "I", overview: ["o1", "o2"], audience: ["a"], outcomes: ["x"] };
    const r = applyIqCopy(p, { "iq.uxiq.tagline": "New", "iq.uxiq.overview.2": "O2" });
    expect(r.tagline).toBe("New");
    expect(r.overview).toEqual(["o1", "O2"]);
    expect(applyIqCopy(p, null).intro).toBe("I");
  });
});
