import { describe, expect, it } from "vitest";
import { buildContactProperties } from "@/lib/hub/assessments";
import { cleanStoredProperties } from "@/lib/hub/submission-properties.server";
import { customerReportUrl } from "@/lib/customer-report";
import type { SubmissionForMapping } from "@/lib/hub/assessments/types";

const HUB = "https://gemiq.globaledgemarkets.com/report/s1";
const APP = "https://productiq.globaledgemarkets.com/report/abc";
const sub = (meta: Record<string, unknown>): SubmissionForMapping => ({
  email: "a@b.co", assessment_key: "productiq", score: 70, tier: "Defined", dimensions: null, detail: null,
  submitted_at: "2026-11-27T00:00:00.000Z", metadata: meta,
});
const props = (meta: Record<string, unknown>, mode: string, locked: boolean) => {
  const s = sub(meta);
  return buildContactProperties({ email: s.email, history: [s], current: s, workflow: {
    submission_id: "s1", report_url: customerReportUrl({ id: "s1", metadata: meta }, mode), report_locked: locked,
    entitlement: String(meta["entitlement"] ?? "none"),
  } });
};

describe("gem_report_url carries the customer report", () => {
  it("app mode with a stored link sends the IQ link", () => {
    expect(props({ entitlement: "subscription", report_url: APP }, "app", false).gem_report_url).toBe(APP);
  });
  it("app mode without a stored link sends the Hub link", () => {
    expect(props({ entitlement: "subscription" }, "app", false).gem_report_url).toBe(HUB);
  });
  it("hub mode sends the Hub link", () => {
    expect(props({ entitlement: "subscription", report_url: APP }, "hub", false).gem_report_url).toBe(HUB);
  });
  it("trial sends no link, even when an admin unlocked it", () => {
    expect(props({ entitlement: "trial", report_url: APP }, "app", false).gem_report_url).toBeUndefined();
  });
  it("locked sends no link", () => {
    expect(props({ entitlement: "unpaid", report_url: APP }, "app", true).gem_report_url).toBeUndefined();
  });
  it("retry fallback still drops the link for locked results", () => {
    expect(cleanStoredProperties({ gem_report_url: APP, gem_report_locked: true } as never).gem_report_url).toBeUndefined();
  });
});
