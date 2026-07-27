import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/dashboard.functions";
import type { DashboardData, DashboardResult } from "@/lib/dashboard.server";
import { HubHeader } from "@/components/HubHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Your IQ Dashboard | GEM.IQ Hub" },
      {
        name: "description",
        content:
          "See every GEM.IQ assessment you have completed — scores, maturity tiers, dimension breakdowns, reports and recommended next assessments.",
      },
      { property: "og:title", content: "Your IQ Dashboard | GEM.IQ Hub" },
      {
        property: "og:description",
        content: "Scores, tiers and reports across every GEM.IQ assessment you have completed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const TIER_LABEL: Record<string, string> = {
  reactive: "Reactive",
  developing: "Developing",
  defined: "Defined",
  advanced: "Advanced",
  optimized: "Optimized",
};

function tierStyle(tier: string | null) {
  switch (tier) {
    case "optimized":
      return "bg-gem-mint/20 text-gem-navy border-gem-mint/50";
    case "advanced":
      return "bg-gem-mint/10 text-gem-navy border-gem-mint/40";
    case "defined":
      return "bg-gem-navy/10 text-gem-navy border-gem-navy/25";
    case "developing":
      return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    default:
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ScoreRing({ score }: { score: number | null }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--color-gem-mint) ${pct * 3.6}deg, rgba(44,54,91,0.12) 0deg)` }}
      aria-hidden
    >
      <div className="grid h-[64px] w-[64px] place-items-center rounded-full bg-background">
        <span className="font-heading text-xl leading-none text-foreground">{score ?? "—"}</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-heading text-foreground">{score}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gem-navy/10">
        <div className="h-full rounded-full bg-gem-mint" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: DashboardResult }) {
  const [open, setOpen] = useState(false);
  const shown = open ? r.dimensions : r.dimensions.slice(0, 4);
  return (
    <article className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
      <div className="flex items-start gap-5">
        <ScoreRing score={r.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-xl text-foreground">{r.display_name}</h3>
            {r.tier && (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${tierStyle(r.tier)}`}>
                {TIER_LABEL[r.tier] ?? r.tier}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed {fmtDate(r.submitted_at)}
            {r.attempts > 1 ? ` · ${r.attempts} attempts` : ""}
          </p>
          {(r.strongest || r.weakest) && (
            <p className="mt-2 text-sm text-foreground/80">
              {r.strongest && <>Strongest: <strong>{r.strongest.label}</strong> ({r.strongest.score}). </>}
              {r.weakest && r.weakest.key !== r.strongest?.key && (
                <>Biggest gap: <strong>{r.weakest.label}</strong> ({r.weakest.score}).</>
              )}
            </p>
          )}
        </div>
      </div>

      {shown.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {shown.map((d) => (
            <DimensionBar key={d.key} label={d.label} score={d.score} />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {r.report_url && (
          <Button asChild size="sm">
            <a href={r.report_url} target="_blank" rel="noreferrer">View report</a>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <a href={r.url} target="_blank" rel="noreferrer">Open {r.display_name}</a>
        </Button>
        {r.dimensions.length > 4 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {open ? "Show fewer dimensions" : `Show all ${r.dimensions.length} dimensions`}
          </button>
        )}
      </div>
    </article>
  );
}

function DashboardPage() {
  const load = useServerFn(getDashboard);
  const [data, setData] = useState<DashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unauth" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = (await load()) as DashboardData;
        if (!alive) return;
        setData(d);
        setState("ready");
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/unauthor/i.test(msg) || /401/.test(msg)) setState("unauth");
        else {
          setMessage(msg);
          setState("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <HubHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {state === "loading" && <p className="text-muted-foreground">Loading your results…</p>}

        {state === "unauth" && (
          <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center">
            <h1 className="font-heading text-2xl text-foreground">Sign in to see your dashboard</h1>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Your GEM.IQ dashboard collects every assessment you have completed across all IQs.
            </p>
            <Button asChild className="mt-6">
              <Link to="/auth" search={{ return_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined } as never}>
                Sign in
              </Link>
            </Button>
          </section>
        )}

        {state === "error" && (
          <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
            <h1 className="font-heading text-xl text-foreground">We couldn’t load your dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </section>
        )}

        {state === "ready" && data && (
          <>
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-heading text-3xl text-foreground">
                  {data.user.first_name ? `${data.user.first_name}’s` : "Your"} IQ dashboard
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {data.user.company ? `${data.user.company} · ` : ""}
                  {data.user.email}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="font-heading text-2xl text-foreground">{data.stats.completed}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">IQs completed</p>
                </div>
                <div>
                  <p className="font-heading text-2xl text-foreground">{data.stats.average_score ?? "—"}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Average score</p>
                </div>
              </div>
            </header>

            {data.subscription && (
              <div className="mt-6 rounded-xl border border-gem-mint/40 bg-gem-mint/5 px-5 py-4 text-sm text-foreground/85">
                {data.subscription.trialing ? (
                  <>
                    <strong>7-day trial active</strong>
                    {data.subscription.trial_ends_at ? ` until ${fmtDate(data.subscription.trial_ends_at)}` : ""} ·{" "}
                    {data.subscription.trial_assessments_used}/{data.subscription.trial_assessment_limit} trial
                    assessment used
                  </>
                ) : (
                  <>
                    Plan status: <strong>{data.subscription.status}</strong>
                    {data.subscription.current_period_end
                      ? ` · renews ${fmtDate(data.subscription.current_period_end)}`
                      : ""}
                  </>
                )}
              </div>
            )}

            <section className="mt-10">
              <h2 className="font-heading text-xl text-foreground">Completed assessments</h2>
              {data.results.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-border/60 bg-card/60 p-6 text-muted-foreground">
                  No results yet. Start any IQ below and your scores will appear here automatically.
                </p>
              ) : (
                <div className="mt-4 grid gap-5">
                  {data.results.map((r) => (
                    <ResultCard key={r.assessment_key} r={r} />
                  ))}
                </div>
              )}
            </section>

            {data.recommendations.length > 0 && (
              <section className="mt-12">
                <h2 className="font-heading text-xl text-foreground">Recommended next</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Based on what you have already benchmarked across the GEM.IQ suite.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {data.recommendations.map((rec) => (
                    <article
                      key={rec.assessment_key}
                      className="rounded-2xl border border-border/60 bg-card/60 p-5"
                    >
                      <h3 className="font-heading text-lg text-foreground">{rec.display_name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{rec.reason}</p>
                      <Button asChild size="sm" variant="outline" className="mt-4">
                        <a href={rec.url} target="_blank" rel="noreferrer">Start {rec.display_name}</a>
                      </Button>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
