import { describe, it, expect } from "vitest";
import { formatHubspotRetries } from "@/lib/hub/admin/status.server";

describe("HubSpot retry counts text", () => {
  it("shows pending and permanently failed counts", () => {
    expect(formatHubspotRetries({ pending: 3, dead: 1 })).toBe("HubSpot retries: 3 pending, 1 failed permanently");
  });
  it("shows zeros", () => {
    expect(formatHubspotRetries({ pending: 0, dead: 0 })).toBe("HubSpot retries: 0 pending, 0 failed permanently");
  });
  it("shows ? when a count couldn't be read", () => {
    expect(formatHubspotRetries({ pending: null, dead: 2 })).toBe("HubSpot retries: ? pending, 2 failed permanently");
  });
});
