import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminCard, StatusChip, type ChipState } from "./ui";

type Overview = {
  apps: { key: string; name: string; paused: boolean; light: string | null; problems: string[]; checked_at: string | null }[];
  week: { total: number; by_entitlement: Record<string, number> };
  tests: Record<string, { status: string; at: string }>;
  mismatches: number;
  retry: { pending: number; failed: number };
};

const lightState = (l: string | null): ChipState => (l === "green" ? "ok" : l === "yellow" ? "warn" : l === "red" ? "fail" : "idle");
const lightText = (l: string | null) => (l === "green" ? "All good" : l === "yellow" ? "Needs attention" : l === "red" ? "Down" : "Not checked");
const testState = (s?: string): ChipState => (s === "pass" ? "ok" : s === "fail" ? "fail" : s ? "warn" : "idle");
const testText = (s?: string) => (s === "pass" ? "Passed" : s === "fail" ? "Failed" : s ? "Waiting" : "Not tested");
const ENT: Record<string, string> = { trial: "Trial", paid: "Paid plan", subscription: "Paid plan", credit: "Single purchase", none: "No plan" };

export function AdminOverview({ load, checkHealth, quickTest, go }: {
  load: () => Promise<unknown>;
  checkHealth: () => Promise<unknown>;
  quickTest: (a: { data: { action: string; key: string } }) => Promise<unknown>;
  go: (section: string) => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setData((await load()) as Overview); } catch (e) { toast.error((e as Error).message); }
  }, [load]);
  useEffect(() => { void refresh(); }, [refresh]);

  if (!data) return <p className="text-muted-foreground">Loading overview…</p>;

  const issues: { text: string; section: string }[] = [];
  for (const a of data.apps) {
    if (a.light === "red" || a.light === "yellow") issues.push({ text: `${a.name}: ${a.problems[0] ?? lightText(a.light)}`, section: "health" });
    if (a.paused) issues.push({ text: `${a.name} is paused`, section: "health" });
    if (data.tests[a.key]?.status === "fail") issues.push({ text: `${a.name} failed its last test`, section: "tests" });
  }
  if (data.mismatches) issues.push({ text: `${data.mismatches} result(s) with a score that doesn't match the Hub's scoring`, section: "content" });
  if (data.retry.failed) issues.push({ text: `${data.retry.failed} HubSpot update(s) gave up after retrying`, section: "system" });

  const runAllTests = async () => {
    setBusy("tests");
    try {
      await Promise.all(data.apps.map((a) => quickTest({ data: { action: "quick", key: a.key } })));
      toast.success("Quick tests sent. Results appear on the Tests page in about a minute.");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="grid gap-6">
      <AdminCard
        title={issues.length ? `${issues.length} thing(s) need attention` : "Everything looks good"}
        description={issues.length ? "Click an item to go straight to it." : "All assessments are healthy, tests are passing and HubSpot is up to date."}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={async () => {
              setBusy("health");
              try { await checkHealth(); await refresh(); toast.success("Health checked"); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
            }}>{busy === "health" ? "Checking…" : "Check all now"}</Button>
            <Button size="sm" disabled={!!busy} onClick={runAllTests}>{busy === "tests" ? "Sending…" : "Run all quick tests"}</Button>
          </div>
        }
      >
        {issues.length ? (
          <ul className="grid gap-2">
            {issues.map((i, n) => (
              <li key={n}>
                <button className="w-full rounded-lg border border-border/60 px-3 py-2 text-left text-sm text-foreground hover:bg-muted/60" onClick={() => go(i.section)}>
                  {i.text} <span className="text-muted-foreground">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </AdminCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Results this week" value={data.week.total} onClick={() => go("reports")} />
        <Stat label="HubSpot updates waiting" value={data.retry.pending} onClick={() => go("system")} />
        <Stat label="Score mismatches" value={data.mismatches} onClick={() => go("content")} />
      </div>

      {data.week.total ? (
        <AdminCard title="This week's results by plan">
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.week.by_entitlement).map(([k, v]) => (
              <StatusChip key={k} state="idle">{ENT[k] ?? k}: {v}</StatusChip>
            ))}
          </div>
        </AdminCard>
      ) : null}

      <AdminCard title="Assessments" description="Health and latest test for each assessment.">
        <div className="divide-y divide-border/60">
          {data.apps.map((a) => (
            <div key={a.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span className="font-heading text-foreground">{a.name}{a.paused ? <span className="ml-2 text-xs text-muted-foreground">(paused)</span> : null}</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => go("health")}><StatusChip state={lightState(a.light)}>{lightText(a.light)}</StatusChip></button>
                <button onClick={() => go("tests")}><StatusChip state={testState(data.tests[a.key]?.status)}>Test: {testText(data.tests[a.key]?.status)}</StatusChip></button>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm hover:bg-muted/40">
      <div className="font-heading text-3xl text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </button>
  );
}
