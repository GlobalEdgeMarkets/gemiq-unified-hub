import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getReport } from "@/lib/report.functions";
import type { ReportView } from "@/lib/hub/report-control.server";
import { HubHeader } from "@/components/HubHeader";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";
import { SECTION_LABELS, type SectionKey } from "@/lib/report-settings";

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
      <main className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
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
      <h1 className="font-heading text-2xl text-foreground">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{body}</p>
      {children}
    </section>
  );
}

function List({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-foreground/90">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  );
}

function Report({ r }: { r: ReportView }) {
  const body = (key: SectionKey) => {
    switch (key) {
      case "summary":
        return <p className="leading-relaxed text-foreground/90">{r.content.summary ?? "Your summary is being prepared."}</p>;
      case "score_tier":
        return (
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="font-heading text-6xl text-foreground">{r.score ?? "—"}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Score out of 100</div>
            </div>
            {r.tier && (
              <span className="rounded-full px-4 py-1.5 text-sm font-semibold text-primary-foreground" style={{ backgroundColor: r.tier.color }}>
                {r.tier.label}
              </span>
            )}
          </div>
        );
      case "dimensions":
        return r.dimensions.length ? (
          <div className="space-y-2.5">
            {r.dimensions.map((d) => (
              <div key={d.key}>
                <div className="flex justify-between text-sm"><span className="text-foreground">{d.label}</span><span className="text-muted-foreground">{d.score}</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-success" style={{ width: `${d.score}%` }} /></div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No dimension scores for this assessment.</p>;
      case "strengths": return <List items={r.content.strengths} />;
      case "gaps": return <List items={r.content.gaps} />;
      case "recommendations": return <List items={r.content.recommendations} />;
      case "next_steps": return <List items={r.content.next_steps} />;
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
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.assessment_name} · {new Date(r.submitted_at).toLocaleDateString()}</p>
        <h1 className="mt-1 font-heading text-3xl text-foreground">{r.title}</h1>
        {r.copy.intro && <p className="mt-2 text-muted-foreground">{r.copy.intro}</p>}
        <div className="mt-4 flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>Download PDF</Button>
          <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </header>

      {r.sections.map((s) => (
        <section key={s.key} className="break-inside-avoid rounded-2xl border border-border/60 bg-card/70 p-6">
          <h2 className="mb-3 font-heading text-lg text-foreground">{SECTION_LABELS[s.key]}</h2>
          {s.locked && !r.is_admin_view ? (
            <div className="text-sm text-muted-foreground">
              Unlocks when your plan starts.
              <Button asChild size="sm" className="ml-3 print:hidden"><a href={r.unlock_url}>Unlock the full report</a></Button>
            </div>
          ) : body(s.key)}
        </section>
      ))}

      {r.copy.disclaimer && <p className="text-xs text-muted-foreground">{r.copy.disclaimer}</p>}
    </article>
  );
}
