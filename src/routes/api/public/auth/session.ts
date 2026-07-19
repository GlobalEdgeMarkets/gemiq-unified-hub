import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";
import { z } from "zod";

const Body = z.object({
  action: z.enum(["signin", "signup", "signout"]),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const Route = createFileRoute("/api/public/auth/session")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_body" }, { status: 400 });

        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { action, email, password, metadata } = parsed.data;

        if (action === "signout") {
          await supabase.auth.signOut();
        } else if (action === "signin") {
          if (!email || !password) return json({ error: "missing_credentials" }, { status: 400 });
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return json({ error: error.message }, { status: 401 });
        } else if (action === "signup") {
          if (!email || !password) return json({ error: "missing_credentials" }, { status: 400 });
          const { error } = await supabase.auth.signUp({
            email, password,
            options: { data: metadata ?? {} },
          });
          if (error) return json({ error: error.message }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        const headers = new Headers({ "Content-Type": "application/json", ...corsHeaders(request) });
        for (const c of setCookies) headers.append("Set-Cookie", c);
        return new Response(JSON.stringify({ ok: true, user }), { headers });
      },
    },
  },
});
