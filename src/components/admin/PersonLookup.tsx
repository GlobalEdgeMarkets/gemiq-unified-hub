import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminCard, StatusChip } from "./ui";

type Person = {
  email: string;
  profile: { full_name: string | null; company: string | null; title: string | null; created_at: string } | null;
  subscriptions: { status: string; lookup_key: string | null; trial_ends_at: string | null; trial_assessments_used: number; trial_assessment_limit: number; current_period_end: string | null; cancel_at_period_end: boolean | null }[];
  reports: { id: string; assessment_name: string; score: number | null; tier: string | null; submitted_at: string; locked: boolean; hidden: boolean; entitlement: string | null }[];
  hubspot: { found: boolean; marketing?: boolean; tier?: string | null; assessment?: string | null; entitlement?: string | null; locked?: string | null; error?: string };
};
const date = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
const PLAN: Record<string, string> = { trialing: "Free trial", active: "Paid plan", canceled: "Cancelled", past_due: "Payment overdue" };

export function PersonLookup({ lookup, reportAction, onDelete }: {
  lookup: (a: { data: { email: string } }) => Promise<unknown>;
  reportAction: (a: { data: { id: string; action: string } }) => Promise<unknown>;
  onDelete: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [p, setP] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e?: string) => {
    const q = (e ?? email).trim();
    if (!q.includes("@")) return;
    setBusy(true);
    try { setP((await lookup({ data: { email: q } })) as Person); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const act = async (id: string, action: string, label: string) => {
    try { await reportAction({ data: { id, action } }); toast.success(label); await search(p?.email); } catch (err) { toast.error((err as Error).message); }
  };
  const sub = p?.subscriptions[0];

  return (
    <div className="grid gap-6">
      <AdminCard title="Find a person" description="Type an email to see their account, plan, every result and their HubSpot status.">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" />
          <Button type="submit" disabled={busy || !email.includes("@")}>{busy ? "Looking…" : "Look up"}</Button>
        </form>
      </AdminCard>

      {p ? (
        <>
          <AdminCard
            title={p.profile?.full_name || p.email}
            description={p.profile ? `${p.email}${p.profile.company ? ` · ${p.profile.company}` : ""} · joined ${date(p.profile.created_at)}` : "No Hub account for this email."}
            action={<Button size="sm" variant="outline" className="text-destructive" onClick={() => onDelete(p.email)}>Delete this person…</Button>}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
                {sub ? (
                  <p className="mt-1 text-sm text-foreground">
                    {PLAN[sub.status] ?? sub.status}
                    {sub.status === "trialing" ? ` · ${sub.trial_assessments_used}/${sub.trial_assessment_limit} free used · ends ${date(sub.trial_ends_at)}` : ""}
                    {sub.status === "active" ? ` · ${sub.cancel_at_period_end ? "ends" : "renews"} ${date(sub.current_period_end)}` : ""}
                  </p>
                ) : <p className="mt-1 text-sm text-muted-foreground">No plan</p>}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">HubSpot</p>
                {p.hubspot.found ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    <StatusChip state={p.hubspot.marketing ? "ok" : "warn"}>{p.hubspot.marketing ? "Marketing contact" : "Not a marketing contact"}</StatusChip>
                    {p.hubspot.tier ? <StatusChip state="idle">Tier: {p.hubspot.tier}</StatusChip> : null}
                    {p.hubspot.entitlement ? <StatusChip state="idle">{p.hubspot.entitlement}</StatusChip> : null}
                  </div>
                ) : <p className="mt-1 text-sm text-muted-foreground">{p.hubspot.error ? `Couldn't check (${p.hubspot.error})` : "Not in HubSpot"}</p>}
              </div>
            </div>
          </AdminCard>

          <AdminCard title={`Results (${p.reports.length})`}>
            {p.reports.length ? (
              <div className="divide-y divide-border/60">
                {p.reports.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{r.assessment_name}</span>
                      <span className="ml-2 text-muted-foreground">{r.score ?? "—"}{r.tier ? ` · ${r.tier}` : ""} · {date(r.submitted_at)}</span>
                      <span className="ml-2"><StatusChip state={r.locked ? "warn" : "ok"}>{r.locked ? "Locked" : "Unlocked"}</StatusChip></span>
                      {r.hidden ? <span className="ml-2"><StatusChip state="idle">Hidden</StatusChip></span> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild><a href={`/report/${r.id}`} target="_blank" rel="noreferrer">Open</a></Button>
                      {r.locked
                        ? <Button size="sm" variant="outline" onClick={() => act(r.id, "unlock", "Report unlocked")}>Unlock</Button>
                        : <Button size="sm" variant="ghost" onClick={() => act(r.id, "relock", "Report locked")}>Lock</Button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No results yet.</p>}
          </AdminCard>
        </>
      ) : null}
    </div>
  );
}
