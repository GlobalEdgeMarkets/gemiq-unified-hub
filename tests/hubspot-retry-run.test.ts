import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/hub/supabase-server", () => ({ createHubServiceClient: () => ({}), selectCurrentSubscription: vi.fn() }));
vi.mock("@/lib/hub/hubspot", () => ({ upsertContactByEmail: vi.fn(), createLeadForContact: vi.fn(), classifyLead: () => "warm" }));
import { runHubspotRetry, backoffMinutes } from "@/lib/hub/hubspot-retry.server";
import { cleanStoredProperties } from "@/lib/hub/submission-properties.server";
import { authorizedJob } from "@/routes/api/public/jobs/retry-hubspot";

function fakeSvc(jobs: any[]) {
  const updates: { table: string; values: any; id: string }[] = [];
  const svc = {
    from(table: string) {
      const q: any = {
        select: () => q, eq: () => q, lte: () => q, order: () => q,
        limit: async () => ({ data: jobs }),
        update: (values: any) => ({ eq: async (_c: string, id: string) => { updates.push({ table, values, id }); return {}; } }),
      };
      return q;
    },
  };
  return { svc, updates };
}
const job = (over: any = {}) => ({ id: "j1", submission_id: "s1", attempts: 0, max_attempts: 5,
  payload: { email: "a@x.com", properties: { email: "a@x.com", firstname: "", gem_report_url: "https://r", tariffiq_pdf_url: "https://p", gem_report_locked: true } }, ...over });

describe("HubSpot retry run", () => {
  it("sends properties rebuilt from the submission, not the stored payload", async () => {
    const { svc, updates } = fakeSvc([job()]);
    const upsert = vi.fn(async () => ({ id: "hs1", skipped: [] }));
    const r = await runHubspotRetry({ svc, upsert, createLead: vi.fn(async () => null) as any,
      rebuild: async () => ({ email: "a@x.com", assessmentKey: "tariffiq", properties: { email: "a@x.com", gem_assessment_tool: "tariffiq" } }) });
    expect(upsert).toHaveBeenCalledWith("a@x.com", { email: "a@x.com", gem_assessment_tool: "tariffiq" }, { label: "GEM.IQ", detail: "TariffIQ" });
    expect(r).toMatchObject({ processed: 1, ok: 1, rebuilt: 1 });
    expect(updates.find(u => u.table === "retry_queue")?.values.status).toBe("done");
    expect(updates.find(u => u.table === "submissions")?.values.hubspot_contact_id).toBe("hs1");
  });

  it("falls back to the stored payload with empty values and locked links removed", async () => {
    const { svc } = fakeSvc([job()]);
    const upsert = vi.fn(async () => ({ id: "hs1", skipped: [] }));
    await runHubspotRetry({ svc, upsert, createLead: vi.fn(async () => null) as any, rebuild: async () => null });
    expect(upsert.mock.calls[0]![1]).toEqual({ email: "a@x.com", gem_report_locked: true });
  });

  it("re-queues with backoff on failure and marks dead at max attempts", async () => {
    const now = Date.parse("2026-11-26T00:00:00Z");
    const fail = vi.fn(async () => { throw new Error("boom"); });
    const a = fakeSvc([job()]);
    const r1 = await runHubspotRetry({ svc: a.svc, upsert: fail as any, createLead: vi.fn() as any, rebuild: async () => null, now: () => now });
    expect(r1.requeued).toBe(1);
    expect(a.updates[0]!.values).toMatchObject({ attempts: 1, last_error: "boom", next_attempt_at: new Date(now + 2 * 60_000).toISOString() });
    const b = fakeSvc([job({ attempts: 4 })]);
    const r2 = await runHubspotRetry({ svc: b.svc, upsert: fail as any, createLead: vi.fn() as any, rebuild: async () => null, now: () => now });
    expect(r2.dead).toBe(1);
    expect(b.updates[0]!.values.status).toBe("dead");
    expect(backoffMinutes(20)).toBe(1440);
  });
});

describe("stored payload cleanup", () => {
  it("keeps links when not locked or trial", () => {
    expect(cleanStoredProperties({ gem_report_url: "u", x_pdf_url: "p", gem_report_locked: false })).toEqual({ gem_report_url: "u", x_pdf_url: "p", gem_report_locked: false });
  });
  it("drops links for trial", () => {
    expect(cleanStoredProperties({ gem_report_url: "u", x_pdf_url: "p", gem_entitlement: "trial" })).toEqual({ gem_entitlement: "trial" });
  });
});

describe("retry job secret check", () => {
  const req = (h?: string) => new Request("https://x/api/public/jobs/retry-hubspot", { method: "POST", headers: h ? { "x-job-secret": h } : {} });
  it("rejects a missing or wrong secret", () => {
    expect(authorizedJob(req(), "s3cret")).toBe(false);
    expect(authorizedJob(req("nope"), "s3cret")).toBe(false);
    expect(authorizedJob(req(""), undefined)).toBe(false);
  });
  it("accepts the right secret", () => expect(authorizedJob(req("s3cret"), "s3cret")).toBe(true));
});
