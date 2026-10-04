import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { unsubscribeEmail } from "@/lib/unsubscribe.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: z.object({ e: z.string().optional(), t: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Unsubscribe — GEM.IQ" },
      { name: "description", content: "Stop follow-up emails about your GEM.IQ assessment results." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Unsubscribe — GEM.IQ" },
      { property: "og:description", content: "Stop follow-up emails about your GEM.IQ assessment results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { e, t } = Route.useSearch();
  const run = useServerFn(unsubscribeEmail);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const go = async () => {
    if (!e || !t) return;
    setState("busy");
    try { await run({ data: { e, t } }); setState("done"); }
    catch (err) { setMsg(err instanceof Error ? err.message : "Something went wrong."); setState("error"); }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-heading text-3xl text-foreground">Unsubscribe</h1>
      {!e || !t ? (
        <p className="mt-3 text-muted-foreground">This link is incomplete. Use the unsubscribe link at the bottom of the email.</p>
      ) : state === "done" ? (
        <p className="mt-3 text-foreground">Done. {e} won't get any more follow-up emails about assessment results. Account emails, such as sign-in links, still arrive.</p>
      ) : (
        <>
          <p className="mt-3 text-muted-foreground">Stop follow-up emails about your assessment results to <b className="text-foreground">{e}</b>?</p>
          <Button className="mt-6 w-fit" disabled={state === "busy"} onClick={go}>{state === "busy" ? "Unsubscribing…" : "Unsubscribe"}</Button>
          {state === "error" && <p className="mt-3 text-sm text-destructive">{msg}</p>}
        </>
      )}
    </main>
  );
}
