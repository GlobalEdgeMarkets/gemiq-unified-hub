import { describe, it, expect } from "vitest";
import { buildContactProperties } from "@/lib/hub/assessments";
import type { SubmissionForMapping } from "@/lib/hub/assessments/types";

const AT = "2026-11-26T12:00:00.000Z";
const WF = (locked: boolean) => ({ submission_id: "s1", report_url: "https://x/report/s1", report_locked: locked, entitlement: "paid" });

function sub(over: Partial<SubmissionForMapping> = {}): SubmissionForMapping {
  return {
    email: "a@b.co", assessment_key: "tariffiq", score: 72, tier: "Defined",
    dimensions: { hts: 80, fta: 60, coo: 70, drawback: 50, valuation: 65, supplyChain: 75, governance: 55, intelligence: 90 },
    detail: { role: "cfo", industry: "Manufacturing", importSpend: "5m_50m", primaryConcern: "costs",
      assessmentStatus: "complete", savingsLow: 100000, savingsHigh: 250000, topPriorities: ["HTS", "FTA", "COO"],
      pdfUrls: { report: "https://old/r.pdf", recommendations: "https://old/rec.pdf", answers: "https://old/a.pdf" } },
    metadata: { entitlement: "paid", report_url: "https://new/r.pdf", recommendation_report_url: "https://new/rec.pdf",
      answers_document_url: "https://new/a.pdf", results_url: "https://new/results" },
    submitted_at: AT, ...over,
  };
}
const build = (s: SubmissionForMapping, locked = false) =>
  buildContactProperties({ email: s.email, history: [s], current: s, workflow: WF(locked) });
const noEmpty = (p: Record<string, unknown>) =>
  Object.entries(p).filter(([k, v]) => k.startsWith("gem_tariff_") && (v == null || v === ""));

describe("TariffIQ → gem_tariff_* mapping", () => {
  it("full paid payload sends every field, links from metadata", () => {
    const p = build(sub());
    expect(p.gem_tariff_score).toBe(72);
    expect(p.gem_tariff_industry).toBe("Manufacturing");
    expect(p.gem_tariff_savings_high).toBe(250000);
    expect(p.gem_tariff_top_priorities).toBe("HTS; FTA; COO");
    expect(p.gem_tariff_supply_chain).toBe(75);
    expect(p.gem_tariff_intelligence).toBe(90);
    expect(p.gem_tariff_pdf_report).toBe("https://new/r.pdf");
    expect(p.gem_tariff_pdf_recommendations).toBe("https://new/rec.pdf");
    expect(p.gem_tariff_pdf_answers).toBe("https://new/a.pdf");
    expect(noEmpty(p)).toEqual([]);
    expect(Object.keys(p).some((k) => k.startsWith("hs_analytics_source"))).toBe(false);
  });

  it("falls back to detail.pdfUrls for older results", () => {
    expect(build(sub({ metadata: { entitlement: "paid" } })).gem_tariff_pdf_report).toBe("https://old/r.pdf");
  });

  it("empty dimensions never blank the dimension fields", () => {
    const p = build(sub({ dimensions: {} }));
    expect(Object.keys(p).filter((k) => /^gem_tariff_(hts|fta|coo|drawback|valuation|supply_chain|governance|intelligence)$/.test(k))).toEqual([]);
    expect(p.gem_tariff_industry).toBe("Manufacturing");
  });

  it("trial results send scores and detail but no links", () => {
    const p = build(sub({ metadata: { entitlement: "trial", report_url: "https://new/r.pdf" } }));
    expect(Object.keys(p).filter((k) => k.includes("_pdf_"))).toEqual([]);
    expect(p.gem_tariff_score).toBe(72);
    expect(p.gem_tariff_hts).toBe(80);
  });

  it("locked report sends no links", () => {
    expect(Object.keys(build(sub(), true)).filter((k) => k.includes("_pdf_"))).toEqual([]);
  });

  it("missing detail sends no detail fields and no blanks", () => {
    const p = build(sub({ detail: null, metadata: null }));
    expect(p.gem_tariff_role).toBeUndefined();
    expect("gem_tariff_industry" in p).toBe(false);
    expect(noEmpty(p)).toEqual([]);
  });

  it("other assessments never send blanks either", () => {
    const g = sub({ assessment_key: "gtmiq", detail: null, dimensions: null, metadata: null });
    const p = build(g);
    expect(Object.entries(p).filter(([k, v]) => k.startsWith("gem_gtm_") && (v == null || v === ""))).toEqual([]);
    expect(p.gem_gtm_score).toBe(72);
  });
});
