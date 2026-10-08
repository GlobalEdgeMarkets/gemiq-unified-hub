import { describe, it, expect } from "vitest";
import { isReportLocked } from "@/lib/report-settings";
import { selectCurrentSubscription } from "@/lib/hub/supabase-server";

const row = (entitlement: string) => ({ report_unlocked_override: null, metadata: { entitlement } });

describe("report lock", () => {
  it("locks trial results until a paid plan is active", () => {
    expect(isReportLocked(row("trial"), false)).toBe(true);
    expect(isReportLocked(row("trial"), true)).toBe(false);
  });
  it("locks signed-in results with no entitlement", () => {
    expect(isReportLocked(row("unpaid"), false)).toBe(true);
  });
  it("keeps anonymous results unlocked as before", () => {
    expect(isReportLocked(row("none"), false)).toBe(false);
  });
});

describe("current subscription", () => {
  it("prefers active over a newer trialing row", async () => {
    const rows = [{ status: "trialing" }, { status: "active" }];
    const q: any = { select: () => q, eq: () => q, order: () => q, limit: async () => ({ data: rows, error: null }) };
    const { data } = await selectCurrentSubscription<{ status: string }>({ from: () => q }, "u", "status");
    expect(data?.status).toBe("active");
  });
});
