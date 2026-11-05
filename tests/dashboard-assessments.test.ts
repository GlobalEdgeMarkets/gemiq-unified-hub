import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://gemiq.globaledgemarkets.com/dashboard"),
}));

vi.mock("@/lib/hub/supabase-server", () => ({
  createHubSupabaseSSR: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "test-user", email: "test@example.com" } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  }),
  selectCurrentSubscription: async () => ({ data: null, error: null }),
  createHubServiceClient: () => ({
    from: () => ({
      select: () => ({ or: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
    }),
  }),
}));

vi.mock("@/lib/hub/report-control.server", () => ({ getAllSettings: async () => null }));
vi.mock("@/lib/hub/composite.server", () => ({ getCompositeConfig: async () => { throw new Error("Use defaults"); } }));

import { loadDashboard } from "@/lib/dashboard.server";

describe("new-user dashboard assessments", () => {
  it("offers all six live assessments including ProductIQ and AITransformIQ", async () => {
    const data = await loadDashboard();
    expect(data?.recommendations.map(r => r.assessment_key).sort()).toEqual([
      "aitransformiq", "gtmiq", "productiq", "salesiq", "tariffiq", "uxiq",
    ]);
    expect(data?.recommendations.find(r => r.assessment_key === "uxiq")?.url).toBe("https://uxiq.globaledgemarkets.com");
  });
});