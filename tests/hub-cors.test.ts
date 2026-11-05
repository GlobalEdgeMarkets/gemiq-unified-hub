import { describe, expect, it } from "vitest";
import { corsHeaders, isAllowedRedirect, json } from "@/lib/hub/http";

const UXIQ_PREVIEW = "https://aa6c70af-9a1d-44df-be2a-a062cada8763.lovableproject.com";
const HUB = "https://gemiq.globaledgemarkets.com";

describe("Hub credentialed CORS", () => {
  it("allows the exact UXIQ preview with credentials and bearer headers", () => {
    const headers = corsHeaders(new Request(`${HUB}/api/public/profile`, { headers: { Origin: UXIQ_PREVIEW } }));
    expect(headers["Access-Control-Allow-Origin"]).toBe(UXIQ_PREVIEW);
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
    expect(headers.Vary).toBe("Origin");
  });

  it("does not allow wildcard preview hosts", () => {
    for (const origin of [
      "https://other-project.lovableproject.com",
      "https://other-project.lovable.app",
      `${UXIQ_PREVIEW}.evil.example`,
    ]) {
      expect(corsHeaders(new Request(HUB, { headers: { Origin: origin } }))["Access-Control-Allow-Origin"]).toBe(HUB);
      expect(isAllowedRedirect(origin)).toBe(false);
    }
  });

  it("preserves exact Hub previews and production IQ origins", () => {
    for (const origin of [
      "https://id-preview--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app",
      "https://uxiq.globaledgemarkets.com",
    ]) {
      expect(corsHeaders(new Request(HUB, { headers: { Origin: origin } }))["Access-Control-Allow-Origin"]).toBe(origin);
    }
  });

  it("keeps authentication error responses readable without changing their status", () => {
    const response = json({ error: "Unauthorized" }, { status: 401 }, new Request(HUB, { headers: { Origin: UXIQ_PREVIEW } }));
    expect(response.status).toBe(401);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(UXIQ_PREVIEW);
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});