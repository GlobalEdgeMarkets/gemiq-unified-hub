import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHubSupabaseSSR } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";

const PROFILE_COLS = "id,email,first_name,last_name,full_name,company,title,role,industry";

const PatchBody = z.object({
  first_name: z.string().max(120).nullable().optional(),
  last_name:  z.string().max(120).nullable().optional(),
  company:    z.string().max(200).nullable().optional(),
  title:      z.string().max(200).nullable().optional(),
  role:       z.string().max(80).nullable().optional(),
  industry:   z.string().max(120).nullable().optional(),
});

export const Route = createFileRoute("/api/public/profile")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),

      GET: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return json({ error: "not_authenticated", profile: null }, { status: 401 }, request);

        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_COLS)
          .eq("id", user.id)
          .maybeSingle();
        if (error) return json({ error: error.message }, { status: 500 }, request);
        return json({ profile: data ?? { id: user.id, email: user.email } }, undefined, request);
      },

      PATCH: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return json({ error: "not_authenticated" }, { status: 401 }, request);

        const parsed = PatchBody.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_body" }, { status: 400 }, request);

        const patch: Record<string, unknown> = { ...parsed.data };
        // Keep full_name in sync when either name part changes.
        if ("first_name" in patch || "last_name" in patch) {
          const { data: existing } = await supabase
            .from("profiles").select("first_name,last_name").eq("id", user.id).maybeSingle();
          const fn = (patch.first_name ?? existing?.first_name ?? "") as string;
          const ln = (patch.last_name  ?? existing?.last_name  ?? "") as string;
          const full = `${fn} ${ln}`.trim();
          if (full) patch.full_name = full;
        }

        const { data, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", user.id)
          .select(PROFILE_COLS)
          .maybeSingle();
        if (error) return json({ error: error.message }, { status: 400 }, request);
        return json({ profile: data }, undefined, request);
      },
    },
  },
});
