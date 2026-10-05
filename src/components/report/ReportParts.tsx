// Shared building blocks for Hub reports (single assessment + combined GEM.IQ).
// Screen and print (PDF) layouts share these; print rules live in styles.css (.report-*).
import type { ReactNode } from "react";

export type TierLite = { key: string; label: string; min: number; color: string };
type Lvl = "low" | "medium" | "high";
export type RoadmapLite = { horizon: "30" | "60" | "90"; action: string; priority: Lvl; effort: Lvl; impact: Lvl; owner: string; assessment?: string };

export function ReportCover(props: { kicker: string; title: string; company: string | null; date: string; refId: string; score: number | null; tier: TierLite | null }) {
  return (
    <section className="report-cover relative overflow-hidden rounded-3xl bg-report-cover p-8 text-report-cover-foreground md:p-12">
      <img src="/brand/gem-logo-light-white-mint.png" alt="GEM — Global Edge Markets" className="h-10 w-auto" />
      <p className="mt-12 text-xs uppercase tracking-[0.25em] text-report-cover-foreground/60">{props.kicker}</p>
      <h1 className="mt-3 max-w-2xl font-heading text-3xl leading-tight md:text-5xl">{props.title}</h1>
      {props.company && <p className="mt-3 text-lg text-report-cover-foreground/80">Prepared for {props.company}</p>}
      <div className="mt-10 flex flex-wrap items-end gap-8">
        <div>
          <div className="font-heading text-6xl md:text-7xl">{props.score ?? "—"}</div>
          <div className="text-xs uppercase tracking-wider text-report-cover-foreground/60">Score out of 100</div>
        </div>
        {props.tier && (
          <span className="rounded-full px-4 py-1.5 text-sm font-semibold text-primary-foreground" style={{ backgroundColor: props.tier.color }}>
            {props.tier.label}
          </span>
        )}
      </div>
      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-1 border-t border-report-cover-foreground/15 pt-4 text-xs text-report-cover-foreground/60">
        <span>{props.date}</span>
        <span>Report {props.refId}</span>
        <span>Confidential</span>
      </div>
    </section>
  );
}

export function ReportSection({ n, title, children, kicker }: { n?: number; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="report-section break-inside-avoid rounded-2xl border border-border/60 bg-card/70 p-6 md:p-8">
      <div className="mb-4 flex items-baseline gap-3">
        {n != null && <span className="font-heading text-sm text-success">{String(n).padStart(2, "0")}</span>}
        <div>
          <h2 className="font-heading text-xl text-foreground">{title}</h2>
          {kicker && <p className="text-sm text-muted-foreground">{kicker}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Locked({ url }: { url: string }) {
  return (
    <div className="relative">
      <div aria-hidden className="select-none space-y-2 blur-sm">
        <div className="h-3 w-11/12 rounded bg-muted" /><div className="h-3 w-9/12 rounded bg-muted" /><div className="h-3 w-10/12 rounded bg-muted" />
      </div>
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        Unlocks with your plan.
        <a href={url} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground print:hidden">Unlock the full report</a>
      </div>
    </div>
  );
}

export function Bullets({ items, empty = "Nothing to show yet." }: { items?: string[]; empty?: string }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((x, i) => (
        <li key={i} className="flex gap-3 text-foreground/90"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />{x}</li>
      ))}
    </ul>
  );
}

/** Five-stage ladder with "you are here" and what the next stage needs. */
export function MaturityLadder({ tiers, score, current }: { tiers: TierLite[]; score: number | null; current: string | null }) {
  const idx = tiers.findIndex((t) => t.key === current);
  const next = idx >= 0 ? tiers[idx + 1] : null;
  return (
    <div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}>
        {tiers.map((t, i) => {
          const here = i === idx;
          return (
            <div key={t.key} className="flex flex-col justify-end">
              <div
                className={`rounded-t-md ${here ? "" : "opacity-30"}`}
                style={{ backgroundColor: t.color, height: `${28 + i * 18}px` }}
              />
              <div className={`mt-2 text-center text-xs ${here ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {t.label}
                <div className="text-[10px] text-muted-foreground">{t.min}+</div>
                {here && <div className="mt-1 text-[10px] uppercase tracking-wider text-success">You are here</div>}
              </div>
            </div>
          );
        })}
      </div>
      {next && score != null && (
        <p className="mt-5 text-sm text-foreground/90">
          <strong>{next.min - score} points</strong> to reach <strong>{next.label}</strong>. Close the gaps listed below to get there.
        </p>
      )}
      {!next && idx >= 0 && <p className="mt-5 text-sm text-foreground/90">You are at the top stage. The focus now is keeping it measured and improving.</p>}
    </div>
  );
}

/** Horizontal 0–100 scale with your score, peer median and top quartile. */
export function BenchmarkBar({ score, median, top }: { score: number | null; median: number; top: number }) {
  const mark = (v: number, label: string, cls: string) => (
    <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${v}%` }}>
      <div className={`h-8 w-0.5 ${cls}`} />
      <div className="mt-1 whitespace-nowrap text-[11px] text-muted-foreground">{label} {v}</div>
    </div>
  );
  return (
    <div className="relative h-16 pt-0">
      <div className="absolute top-3 h-2 w-full rounded-full bg-muted" />
      <div className="absolute top-3 h-2 rounded-full bg-muted-foreground/25" style={{ left: `${median}%`, width: `${Math.max(0, top - median)}%` }} />
      {mark(median, "Peer median", "bg-muted-foreground")}
      {mark(top, "Top quartile", "bg-muted-foreground")}
      {score != null && (
        <div className="absolute -top-1 -translate-x-1/2" style={{ left: `${score}%` }}>
          <div className="h-5 w-5 rounded-full border-4 border-background bg-success shadow" />
        </div>
      )}
    </div>
  );
}

const heat = (v: number) => (v >= 70 ? "bg-success/80" : v >= 55 ? "bg-success/45" : v >= 40 ? "bg-warning/60" : "bg-destructive/60");

/** Strengths/gaps heat map: one tile per dimension with an optional peer delta and insight. */
export function HeatMap({ items }: { items: { key: string; label: string; score: number; peer?: number; insight?: string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((d) => (
        <div key={d.key} className="break-inside-avoid rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-md font-heading text-foreground ${heat(d.score)}`}>{d.score}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{d.label}</div>
              {d.peer != null && (
                <div className="text-xs text-muted-foreground">
                  Peers {d.peer} · {d.score - d.peer >= 0 ? "+" : ""}{d.score - d.peer}
                </div>
              )}
            </div>
          </div>
          {d.insight && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d.insight}</p>}
        </div>
      ))}
    </div>
  );
}

const lvlN: Record<Lvl, number> = { low: 0, medium: 1, high: 2 };
const prioCls: Record<Lvl, string> = { high: "bg-destructive/15 text-destructive", medium: "bg-warning/20 text-foreground", low: "bg-muted text-muted-foreground" };

/** 30/60/90 roadmap table plus an impact/effort matrix. */
export function Roadmap({ items }: { items: RoadmapLite[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Your roadmap is being prepared.</p>;
  const horizons = ["30", "60", "90"] as const;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {horizons.map((h) => (
          <div key={h} className="break-inside-avoid">
            <div className="mb-2 font-heading text-sm text-foreground">Next {h} days</div>
            <ol className="space-y-2">
              {items.map((x, i) => ({ x, i })).filter(({ x }) => x.horizon === h).map(({ x, i }) => (
                <li key={i} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-heading text-xs text-success">{i + 1}</span>
                    <span className="text-foreground/90">{x.action}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    <span className={`rounded px-1.5 py-0.5 ${prioCls[x.priority]}`}>{x.priority} priority</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{x.owner}</span>
                    {x.assessment && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{x.assessment}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="break-inside-avoid">
        <div className="mb-2 font-heading text-sm text-foreground">Impact vs effort</div>
        <div className="relative grid aspect-[2/1] max-w-xl grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border border-border/60 text-[11px] text-muted-foreground">
          <div className="border-b border-r border-border/60 bg-success/10 p-2">Quick wins</div>
          <div className="border-b border-border/60 p-2 text-right">Big bets</div>
          <div className="border-r border-border/60 p-2">Fill-ins</div>
          <div className="p-2 text-right">Deprioritise</div>
          {items.map((x, i) => {
            const left = 12 + lvlN[x.effort] * 38 + (i % 3) * 4;
            const top = 82 - lvlN[x.impact] * 34 - (i % 2) * 6;
            return (
              <span key={i} className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary font-heading text-[11px] text-primary-foreground" style={{ left: `${left}%`, top: `${top}%` }}>
                {i + 1}
              </span>
            );
          })}
        </div>
        <div className="mt-1 flex max-w-xl justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>Low effort</span><span>High effort</span></div>
      </div>
    </div>
  );
}
