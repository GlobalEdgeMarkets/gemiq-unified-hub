// Shared implementation of the legacy-user import. Moved out of the route so
// the admin console server function can call it in-process. Behaviour unchanged.
import { createHubServiceClient } from "@/lib/hub/supabase-server";

export type ImportLegacyUserInput = {
  email: string;
  full_name?: string;
  company?: string;
  hubspot_contact_id?: string;
  send_invite?: boolean;
};

export type ImportLegacyUserResult =
  | { ok: true; user_id?: string; email: string; created: boolean; invited: boolean }
  | { ok: false; error: string; detail?: string };

export async function runImportLegacyUser(input: ImportLegacyUserInput): Promise<ImportLegacyUserResult> {
  const { email, full_name, company, hubspot_contact_id } = input;
  const send_invite = input.send_invite ?? true;
  const svc = createHubServiceClient();

  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find(u => (u.email ?? "").toLowerCase() === email.toLowerCase());
  let created = false;

  if (!user) {
    if (send_invite) {
      const { data, error } = await svc.auth.admin.inviteUserByEmail(email, {
        data: { full_name, company },
      });
      if (error) return { ok: false, error: "invite_failed", detail: error.message };
      user = data.user; created = true;
    } else {
      const { data, error } = await svc.auth.admin.createUser({
        email, email_confirm: false, user_metadata: { full_name, company },
      });
      if (error) return { ok: false, error: "create_failed", detail: error.message };
      user = data.user; created = true;
    }
  }

  if (user) {
    await svc.from("profiles").upsert({
      id: user.id,
      email,
      full_name: full_name ?? null,
      company: company ?? null,
      hubspot_contact_id: hubspot_contact_id ?? null,
    }, { onConflict: "id" });
  }

  return { ok: true, user_id: user?.id, email, created, invited: created && send_invite };
}
