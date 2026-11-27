/** /account is a legacy portal address: forward to the dashboard, keeping any query string. */
export function accountRedirectTarget(requestUrl: string): string {
  const u = new URL(requestUrl);
  return `/dashboard${u.search}`;
}

/** Dashboard opens the Stripe billing portal only when asked with billing=1. */
export function wantsBillingPortal(search: string): boolean {
  return new URLSearchParams(search).get("billing") === "1";
}
