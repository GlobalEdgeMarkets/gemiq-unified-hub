import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getReport } from "@/lib/report.functions";
import type { ReportView } from "@/lib/hub/report-control.server";
import { HubHeader } from "@/components/HubHeader";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";
import { SECTION_LABELS, type SectionKey } from "@/lib/report-settings";
import { RadarChart } from "@/components/iq/RadarChart";
import { BenchmarkBar, Bullets, HeatMap, Locked, MaturityLadder, ReportCover, ReportSection, Roadmap } from "@/components/report/ReportParts";

export const Route = createFileRoute("/report/$id")({
  ssr: false,
  component: ReportPage,
  head: () =>
    buildHead({
      title: "Your assessment report | GEM.IQ",
      description: "Your GEM.IQ assessment report: score, maturity tier, strengths, gaps and recommended next steps.",
      ogDescription: "A GEM.IQ assessment report with score, tier and recommended next steps.",
      twitterCard: "summary",
      robots: "noindex, nofollow",
    }),
});

type State = { state: "loading" } | { state: "anon" } | { state: "missing" } | { state: "error"; message: string } | { state: "ok"; report: ReportView };

function ReportPage() {
  const { id } = Route.useParams();
  const load = useServerFn(getReport);
  const [s, setS] = useState<State>({ state: "loading" });

  useEffect(() => {
    let alive = true;
    load({ data: { id } })
      .then((r) => alive && setS(r as State))
      .catch((e) => alive && setS({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => { alive = false; };
  }, [id, load]);

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden"><HubHeader /></div>
      <main className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        {s.state === "loading" && <p className="text-muted-foreground">Loading your report…</p>}
        {s.state === "anon" && (
          <Notice title="Sign in to see this report" body="Reports are private. Sign in with the email address you used for the assessment.">
            <Button asChild className="mt-6">
              <Link to="/auth" search={{ redirect: typeof window !== "undefined" ? window.location.href : undefined }}>Sign in</Link>
            </Button>
          </Notice>
        )}
        {s.state === "missing" && (
          <Notice title="Report not found" body="This report doesn't exist or belongs to a different account.">
            <Button asChild variant="outline" className="mt-6"><Link to="/dashboard">Go to my dashboard</Link></Button>
          </Notice>
        )}
        {s.state === "error" && <Notice title="We couldn't load this report" body={s.message} />}
        {s.state === "ok" && <Report r={s.report} />}
      </main>
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center">
      <h1 className="font-display text-2xl text-foreground">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{body}</p>
      {children}
    </section>
  );
}

function Report({ r }: { r: ReportView }) {
  const tier = r.tiers.find((t) => t.key === r.tier_key) ?? null;
  const date = new Date(r.submitted_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const c = r.content;
  const b = r.benchmark;
  const show = (s: { locked: boolean }) => !s.locked || r.is_admin_view;

  const body = (key: SectionKey) => {
    switch (key) {
      case "executive_summary": {
        const e = c.executive_summary;
        if (!e) return <p className="text-muted-foreground">Your executive summary is being prepared.</p>;
        return (
          <div className="space-y-5">
            <p className="font-display text-xl leading-snug text-foreground">{e.headline}</p>
            {e.so_what && <p className="border-l-2 border-success pl-4 text-foreground/90">{e.so_what}</p>}
            <div className="grid gap-6 md:grid-cols-2">
              <div><h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Key findings</h3><Bullets items={e.findings} /></div>
              <div><h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Top priorities</h3><Bullets items={e.priorities} /></div>
            </div>
          </div>
        );
      }
      case "summary":
        return <p className="leading-relaxed text-foreground/90">{c.summary ?? "Your summary is being prepared."}</p>;
      case "score_tier":
        return (
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="font-display text-6xl text-foreground">{r.score ?? "—"}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Score out of 100</div>
            </div>
            {tier && <span className="rounded-full px-4 py-1.5 text-sm font-semibold text-primary-foreground" style={{ backgroundColor: tier.color }}>{tier.label}</span>}
            {b?.percentile != null && <p className="text-sm text-muted-foreground">Higher than {b.percentile}% of {b.label.toLowerCase()}.</p>}
          </div>
        );
      case "maturity":
        return <MaturityLadder tiers={r.tiers} score={r.score} current={r.tier_key} />;
      case "benchmark":
        if (!b) return <p className="text-sm text-muted-foreground">Benchmark not available yet.</p>;
        return (
          <div className="space-y-4">
            <BenchmarkBar score={r.score} median={b.median} top={b.top} />
            <p className="text-sm text-muted-foreground">
              {b.source === "reference"
                ? `Benchmark building: there are not yet enough results to compare against real peers, so this uses GEM reference values. It switches to real peer data automatically once enough companies have taken ${r.assessment_name}.`
                : `Compared with ${b.n} ${b.label.toLowerCase()} (latest result per company).`}
            </p>
          </div>
        );
      case "dimensions":
        if (!r.dimensions.length) return <p className="text-sm text-muted-foreground">No dimension scores for this assessment.</p>;
        return (
          <div className="space-y-6">
            {r.dimensions.length >= 3 && (
              <div className="mx-auto max-w-md">
                <RadarChart
                  labels={r.dimensions.map((d) => d.label)}
                  values={r.dimensions.map((d) => d.score)}
                  benchmark={b && Object.keys(b.dimensions).length ? r.dimensions.map((d) => b.dimensions[d.key] ?? b.median) : undefined}
                  color="var(--success)"
                />
              </div>
            )}
            <HeatMap items={r.dimensions.map((d) => ({ ...d, peer: b?.dimensions[d.key], insight: c.dimension_insights?.[d.key] }))} />
          </div>
        );
      case "strengths": return <Bullets items={c.strengths} />;
      case "gaps":
        return (
          <div className="space-y-5">
            <Bullets items={c.gaps} />
            {!!c.risks?.length && (
              <div><h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Risks if nothing changes</h3><Bullets items={c.risks} /></div>
            )}
          </div>
        );
      case "recommendations": return <Bullets items={c.recommendations} />;
      case "roadmap": return <Roadmap items={c.roadmap ?? []} />;
      case "next_steps": return <Bullets items={c.next_steps} />;
      case "methodology": {
        const m = r.methodology;
        return (
          <div className="space-y-4 text-sm text-foreground/90">
            {m.summary && <p>{m.summary}</p>}
            <p><strong>How the score is built.</strong> {m.scoring}</p>
            <p><strong>Maturity model.</strong> {m.maturity_model}</p>
            {!!m.frameworks.length && <p><strong>Frameworks used.</strong> {m.frameworks.join(" · ")}</p>}
            {!!m.rationale.length && (
              <div>
                <strong>Why we ask these questions</strong>
                <ul className="mt-2 space-y-1.5">{m.rationale.map((x) => <li key={x.title}><span className="text-foreground">{x.title}:</span> <span className="text-muted-foreground">{x.text}</span></li>)}</ul>
              </div>
            )}
            {b && <p><strong>Benchmark basis.</strong> {b.source === "reference" ? "GEM reference values (not enough peer results yet)." : `${b.label}, ${b.n} companies, latest result each.`}</p>}
            <p className="text-muted-foreground">{m.how_to_read}</p>
          </div>
        );
      }
      case "talk_to_gem":
        return (
          <div>
            {r.copy.closing_message && <p className="text-foreground/90">{r.copy.closing_message}</p>}
            {r.copy.closing_cta && r.copy.closing_url && (
              <Button asChild className="mt-4 print:hidden"><a href={r.copy.closing_url} target="_blank" rel="noreferrer">{r.copy.closing_cta}</a></Button>
            )}
          </div>
        );
    }
  };

  return (
    <article className="space-y-6">
      {r.is_admin_view && (
        <p className="rounded-lg border border-border bg-muted/60 px-4 py-2 text-sm text-muted-foreground print:hidden">
          Admin preview of {r.email}'s report{r.locked ? " — the user currently sees the locked version" : ""}{r.hidden ? " — hidden from the user" : ""}.
        </p>
      )}
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>Download PDF</Button>
        <Button variant="ghost" size="sm" asChild><Link to="/report/combined">Combined GEM.IQ report</Link></Button>
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
      <ReportCover kicker={`${r.assessment_name} · Maturity assessment`} title={r.title} company={r.company} date={date} refId={r.report_ref} score={r.score} tier={tier} />
      {r.copy.intro && <p className="text-lg text-muted-foreground">{r.copy.intro}</p>}

      {r.sections.map((s, i) => (
        <ReportSection key={s.key} n={i + 1} title={SECTION_LABELS[s.key]}>
          {show(s) ? body(s.key) : <Locked url={r.unlock_url} />}
        </ReportSection>
      ))}

      {r.copy.disclaimer && <p className="text-xs text-muted-foreground">{r.copy.disclaimer}</p>}
    </article>
  );
}
