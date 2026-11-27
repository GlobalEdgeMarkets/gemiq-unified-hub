import { describe, expect, it } from "vitest";
import { customerReportUrl } from "../src/lib/customer-report";

const hub = "https://gemiq.globaledgemarkets.com/report/abc";
describe("customer report rule", () => {
  it("hub mode always gives the Hub report", () => {
    expect(customerReportUrl({ id: "abc", metadata: { report_url: "https://productiq.example/r/1" } }, "hub")).toBe(hub);
  });
  it("app mode gives the IQ's stored link", () => {
    expect(customerReportUrl({ id: "abc", metadata: { report_url: "https://productiq.example/r/1" } }, "app")).toBe("https://productiq.example/r/1");
  });
  it("app mode falls back to the Hub report without a stored link", () => {
    expect(customerReportUrl({ id: "abc", metadata: {} }, "app")).toBe(hub);
  });
});
