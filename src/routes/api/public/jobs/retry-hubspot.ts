import { createFileRoute } from "@tanstack/react-router";
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { upsertContactByEmail } from "@/lib/hub/hubspot";
import { json } from "@/lib/hub/http";

function authorized(req: Request) {
  const secret = req.headers.get("x-job-secret") ?? new URL(req.url).searchParams.get("secret");
  return !!secret && secret === process.env.JOB_SECRET;
}

export const Route = createFileRoute("/api/public/jobs/retry-hubspot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("forbidden", { status: 403 });
        const svc = createHubServiceClient();
        const nowIso = new Date().toISOString();
        const { data: jobs } = await svc
          .from("retry_queue")
          .select("*")
          .eq("status", "pending")
          .eq("job_type", "hubspot_upsert")
          .lte("next_attempt_at", nowIso)
          .order("next_attempt_at", { ascending: true })
          .limit(25);
        if (!jobs?.length) return json({ processed: 0 }, undefined, request);

        let ok = 0, dead = 0, requeued = 0;
        for (const j of jobs) {
          const payload = j.payload as { email: string; properties: Record<string, any> };
          try {
            const { id: hsId } = await upsertContactByEmail(payload.email, payload.properties);
            await svc.from("retry_queue").update({ status: "done", attempts: j.attempts + 1 }).eq("id", j.id);
            if (j.submission_id) {
              await svc.from("submissions").update({
                hubspot_contact_id: hsId,
                hubspot_synced_at: new Date().toISOString(),
                hubspot_sync_error: null,
              }).eq("id", j.submission_id);
            }
            ok++;
          } catch (e: any) {
            const attempts = j.attempts + 1;
            if (attempts >= j.max_attempts) {
              await svc.from("retry_queue").update({ status: "dead", attempts, last_error: e.message }).eq("id", j.id);
              dead++;
            } else {
              const backoffMin = Math.min(60 * 24, Math.pow(2, attempts)); // cap 1 day
              await svc.from("retry_queue").update({
                attempts,
                last_error: e.message,
                next_attempt_at: new Date(Date.now() + backoffMin * 60_000).toISOString(),
              }).eq("id", j.id);
              requeued++;
            }
          }
        }
        return json({ processed: jobs.length, ok, dead, requeued }, undefined, request);
      },
    },
  },
});
