import { createFileRoute } from "@tanstack/react-router";
import { HubHeader } from "@/components/HubHeader";
import { buildHead } from "@/lib/seo";
import { getMethodology } from "@/lib/methodology.functions";

export const Route = createFileRoute("/methodology")({
  loader: () => getMethodology(),
  head: () =>
    buildHead({
      title: "Methodology — How GEM.IQ Scores Business Maturity",
      path: "/methodology",
      description:
        "How GEM.IQ assessments are built and scored: weighted sections, five maturity stages, the combined business-health score, and the research behind each assessment.",
      ogTitle: "The GEM.IQ Methodology",
      ogDescription: "The scoring rule, maturity stages and research behind every GEM.IQ assessment.",
      ogType: "article",
      twitterCard: "summary",
    }),
  component: MethodologyPage,
});

const BLOCKS: [string, string][] = [
  ["overview", "What GEM.IQ measures"],
  ["scoring", "How scores are calculated"],
  ["maturity_model", "The maturity stages"],
  ["data_sources", "Research and sources"],
  ["how_to_read", "How to read your results"],
];

function MethodologyPage() {
  const data = Route.useLoaderData();
  const m = data.methodology as Record<string, string>;
  const totalW = data.assessments.reduce((n, a) => n + a.weight, 0) || 1;
  return (
    <div className="min-h-screen bg-background">
      <HubHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Methodology</p>
        <h1 className="mt-2 font-heading text-4xl text-foreground">How GEM.IQ measures business maturity</h1>

        <div className="mt-10 grid gap-8">
          {BLOCKS.map(([k, label]) => m[k] ? (
            <section key={k}>
              <h2 className="font-heading text-xl text-foreground">{label}</h2>
              <p className="mt-2 whitespace-pre-line text-foreground/80">{m[k]}</p>
            </section>
          ) : null)}
        </div>

        <section className="mt-12 rounded-2xl border border-border/60 bg-card/70 p-6">
          <h2 className="font-heading text-xl text-foreground">The combined GEM.IQ score</h2>
          <p className="mt-2 text-sm text-foreground/80">
            Your latest score in each assessment counts toward one overall score, weighted as below. The overall maturity stage appears once you've completed {data.min_for_tier} assessments.
          </p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {data.assessments.filter((a) => a.weight > 0).map((a) => (
              <li key={a.key} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span>{a.name}</span><span className="text-muted-foreground">{Math.round((a.weight / totalW) * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Stages: {[...data.tiers].sort((a, b) => a.min - b.min).map((t) => `${t.label} (${t.min}+)`).join(" · ")}
          </p>
        </section>

        <div className="mt-12 grid gap-6">
          {data.assessments.filter((a) => a.methodology || a.sections.length).map((a) => (
            <section key={a.key} className="rounded-2xl border border-border/60 p-6">
              <h2 className="font-heading text-xl text-foreground">{a.name}</h2>
              {a.methodology?.summary && <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{a.methodology.summary}</p>}
              {a.methodology?.frameworks?.length ? (
                <><h3 className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Draws on</h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-foreground/80">{a.methodology.frameworks.map((f) => <li key={f}>{f}</li>)}</ul></>
              ) : null}
              {a.methodology?.comparison && (
                <><h3 className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Compared with other approaches</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{a.methodology.comparison}</p></>
              )}
              {a.sections.length > 0 && (
                <><h3 className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Why we ask about</h3>
                <dl className="mt-1 grid gap-2 text-sm">{a.sections.map((s) => <div key={s.title}><dt className="font-medium text-foreground">{s.title}</dt><dd className="text-foreground/80">{s.rationale}</dd></div>)}</dl></>
              )}
              {a.methodology?.references?.length ? (
                <><h3 className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Sources</h3>
                <ul className="mt-1 grid gap-1 text-sm">{a.methodology.references.map((r) => <li key={r.title}>{r.url ? <a className="underline underline-offset-4" href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}</li>)}</ul></>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
