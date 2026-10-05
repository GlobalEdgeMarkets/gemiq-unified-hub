// Shared Admin building blocks: one card style, one status chip, one result list.
import type { ReactNode } from "react";

export function AdminCard({ title, description, children, tone = "default", action }: {
  title: string; description?: string; children?: ReactNode; tone?: "default" | "danger"; action?: ReactNode;
}) {
  const border = tone === "danger" ? "border-destructive/40" : "border-border/60";
  return (
    <section className={`rounded-2xl border ${border} bg-card p-6 shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`font-heading text-lg ${tone === "danger" ? "text-destructive" : "text-foreground"}`}>{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export type ChipState = "ok" | "warn" | "fail" | "idle";
const CHIP: Record<ChipState, string> = {
  ok: "bg-primary/15 text-primary",
  warn: "bg-warning/20 text-foreground",
  fail: "bg-destructive/15 text-destructive",
  idle: "bg-muted text-muted-foreground",
};
export function StatusChip({ state, children }: { state: ChipState; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CHIP[state]}`}>{children}</span>;
}

export function ResultList({ heading, ok, items }: {
  heading: string; ok: boolean; items: { ok: boolean; text: string }[];
}) {
  return (
    <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
      <p className={`font-medium ${ok ? "text-primary" : "text-destructive"}`}>{heading}</p>
      {items.length ? (
        <ul className="mt-2 grid gap-1">
          {items.map((i, n) => (
            <li key={n} className={i.ok ? "text-foreground/80" : "text-destructive"}>{i.ok ? "✓" : "✗"} {i.text}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PageIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-2xl text-foreground">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
