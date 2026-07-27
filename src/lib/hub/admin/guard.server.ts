// Admin allowlist gate. ADMIN_EMAILS is a server-only, comma-separated list.
// Never expose it (or JOB_SECRET) to the browser.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** Throws unless the authenticated claims belong to an allowlisted admin. */
export function assertAdmin(claims: Record<string, unknown> | undefined): string {
  const email = typeof claims?.email === "string" ? claims.email : null;
  if (!isAdminEmail(email)) throw new Error("Forbidden: admin access required");
  return email as string;
}
