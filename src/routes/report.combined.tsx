import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCombinedReport } from "@/lib/report.functions";
import type { CombinedReportView } from "@/lib/hub/report-control.server";
import { HubHeader } from "@/components/HubHeader";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";
import { Bullets, Locked, MaturityLadder, ReportCover, ReportSection, Roadmap } from "@/components/report/ReportParts";

export const Route = createFileRoute("/report/combined")({
  ssr: false,
  component: CombinedPage,
  head: () =>
    buildHead({
      title: "Your GEM.IQ Business Health report | GEM.IQ",
      description: "Your combined GEM.IQ report: one business health score across every assessment, cross-discipline insights and a prioritised roadmap.",
      ogDescription: "A combined GEM.IQ business health report across all assessments.",
      twitterCard: "summary",
      robots: "noindex, nofollow",
    }),
});

type State = { state: "loading" } | { state: "anon" } | { state: "error"; message: string } | { state: "ok"; report: CombinedReportView };

function CombinedPage() {
  const load = useServerFn(getCombinedReport);
  const [s, setS] = useState<State>({ state: "loading" });
  useEffect(() => {
    let alive = true;
    load()
      .then((r) => alive && setS(r as State))
      .catch((e) => alive && setS({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => { alive = false; };
  }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden"><HubHeader /></div>
      <main className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        {s.state === "loading" && <p className="text-muted-foreground">Loading your combined report…</p>}
        {s.state === "anon" && (
          <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center">
            <h1 className="font-display text-2xl text-foreground">Sign in to see your combined report</h1>
            <Button asChild className="mt-6"><Link to="/auth">Sign in</Link></Button>
          </section>
        )}
        {s.state === "error" && <p className="text-destructive">{s.message}</p>}
        {s.state === "ok" && <Combined r={s.report} />}
      </main>
    </div>
  );
}

function Combined({ r }: { r: CombinedReportView }) {
  const tier = r.tiers.find((t) => t.key === r.tier_key) ?? null;
  const date = new Date(r.generated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  let n = 0;
  return (
    <article className="space-y-6">
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>Download PDF</Button>
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
      <ReportCover
        kicker={`GEM.IQ Business Health · ${r.coverage.completed} of ${r.coverage.total} assessments complete`}
        title={`Business health report${r.company ? ` for ${r.company}` : ""}`}
        company={null}
        date={date}
        refId={`GEM-COMBINED-${date.replace(/\W+/g, "")}`}
        score={r.score}
        tier={tier}
      />

      <ReportSection n={++n} title="Executive summary">
        <div className="space-y-3 text-foreground/90">
          <p className="font-display text-xl leading-snug text-foreground">
            {r.score == null
              ? "Complete your first assessment to start your combined picture."
              : `Your combined GEM.IQ score is ${r.score}${r.tier_label ? `, placing the business at the ${r.tier_label} stage` : ""}.`}
          </p>
          {r.needed_for_tier > 0 && <p className="text-sm text-muted-foreground">Complete {r.needed_for_tier} more assessment{r.needed_for_tier > 1 ? "s" : ""} to see your overall stage.</p>}
          <Bullets items={r.insights} />
        </div>
      </ReportSection>

      {tier && <ReportSection n={++n} title="Maturity position"><MaturityLadder tiers={r.tiers} score={r.score} current={r.tier_key} /></ReportSection>}

      <ReportSection n={++n} title="Score by discipline" kicker="Your latest result in each assessment">
        <div className="space-y-3">
          {r.contributions.map((x) => (
            <div key={x.assessment_key}>
              <div className="flex justify-between text-sm">
                {x.report_id ? <Link to="/report/$id" params={{ id: x.report_id }} className="text-foreground underline-offset-4 hover:underline">{x.display_name}</Link> : <span className="text-foreground">{x.display_name}</span>}
                <span className="text-muted-foreground">{x.score ?? "—"}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-success" style={{ width: `${x.score ?? 0}%` }} /></div>
            </div>
          ))}
          {r.missing.map((x) => (
            <div key={x.assessment_key} className="flex items-center justify-between rounded-lg border border-dashed border-border p-3 text-sm">
              <span className="text-muted-foreground">{x.display_name} — not taken yet</span>
              <a href={x.url} className="text-success print:hidden">Take it</a>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection n={++n} title="Strengths and gaps across the business">
        {r.locked ? <Locked url={r.unlock_url} /> : (
          <div className="grid gap-6 md:grid-cols-2">
            <div><h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Strongest areas</h3><Bullets items={r.strengths.map((x) => `${x.label} (${x.score}) — ${x.sources.join(", ")}`)} /></div>
            <div><h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Biggest gaps</h3><Bullets items={r.gaps.map((x) => `${x.label} (${x.score}) — ${x.sources.join(", ")}`)} /></div>
          </div>
        )}
      </ReportSection>

      <ReportSection n={++n} title="Combined action roadmap" kicker="Top actions from all your assessment reports">
        {r.locked ? <Locked url={r.unlock_url} /> : <Roadmap items={r.roadmap} />}
      </ReportSection>

      {r.next && (
        <ReportSection n={++n} title="Complete your picture">
          <p className="text-foreground/90">Next recommended: <strong>{r.next.display_name}</strong>. It carries the most weight among the assessments you haven't taken.</p>
          <Button asChild className="mt-4 print:hidden"><a href={r.next.url}>Start {r.next.display_name}</a></Button>
        </ReportSection>
      )}

      <ReportSection n={++n} title="Methodology & evidence">
        <div className="space-y-3 text-sm text-foreground/90">
          <p>{r.methodology.overview}</p>
          <p><strong>How the score is built.</strong> {r.methodology.scoring}</p>
          <p><strong>Maturity model.</strong> {r.methodology.maturity_model}</p>
          <p className="text-muted-foreground">{r.methodology.how_to_read}</p>
        </div>
      </ReportSection>
    </article>
  );
}
