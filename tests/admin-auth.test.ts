import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must be declared before importing the modules under test.
const getUser = vi.fn();
const getRequest = vi.fn();
const createHubSupabaseSSR = vi.fn(() => ({ auth: { getUser } }));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => getRequest(),
}));

vi.mock("@/lib/hub/supabase-server", () => ({
  createHubSupabaseSSR: (...args: unknown[]) => createHubSupabaseSSR(...(args as [])),
}));

const { requireHubAdmin } = await import("@/lib/hub/admin/middleware");
const { isAdminEmail, assertAdmin } = await import("@/lib/hub/admin/guard.server");

type Ctx = { hubAdmin: { userId: string; email: string | null; isAdmin: boolean } };

/** Invokes the middleware's server handler the way TanStack does at runtime. */
async function runMiddleware(): Promise<Ctx> {
  const server = (requireHubAdmin as unknown as {
    options: { server: (o: { next: (o: { context: Ctx }) => Ctx }) => Promise<Ctx> };
  }).options.server;
  return await server({ next: ({ context }) => context });
}

const cookieRequest = (cookie: string) =>
  new Request("https://gemiq.globaledgemarkets.com/_serverFn/adminWhoami", {
    headers: { cookie },
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_EMAILS = "alexr@globaledgemarkets.com, ops@globaledgemarkets.com";
  getRequest.mockReturnValue(cookieRequest("sb-access-token=fake-session"));
  getUser.mockResolvedValue({ data: { user: null }, error: null });
});

describe("admin allowlist", () => {
  it("accepts allowlisted emails case-insensitively", () => {
    expect(isAdminEmail("alexr@globaledgemarkets.com")).toBe(true);
    expect(isAdminEmail("ALEXR@GlobalEdgeMarkets.com")).toBe(true);
    expect(isAdminEmail("ops@globaledgemarkets.com")).toBe(true);
  });

  it("rejects non-allowlisted, empty, and missing emails", () => {
    expect(isAdminEmail("someone@else.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(() => assertAdmin({ email: "someone@else.com" })).toThrow(/admin access required/i);
  });

  it("denies everyone when ADMIN_EMAILS is unset", () => {
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("alexr@globaledgemarkets.com")).toBe(false);
  });
});

describe("requireHubAdmin cookie session", () => {
  it("resolves the cookie session and marks allowlisted users as admin", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "alexr@globaledgemarkets.com" } },
      error: null,
    });

    const ctx = await runMiddleware();

    expect(ctx.hubAdmin).toEqual({
      userId: "user-1",
      email: "alexr@globaledgemarkets.com",
      isAdmin: true,
    });
    // The session must come from the request cookies, not a bearer token.
    const [passedRequest] = createHubSupabaseSSR.mock.calls[0] as unknown as [Request];
    expect(passedRequest.headers.get("cookie")).toContain("sb-access-token=fake-session");
  });

  it("passes through signed-in non-admins with isAdmin=false", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "someone@else.com" } },
      error: null,
    });

    const ctx = await runMiddleware();

    expect(ctx.hubAdmin.isAdmin).toBe(false);
    expect(ctx.hubAdmin.email).toBe("someone@else.com");
  });

  it("treats a user without an email as non-admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-3" } }, error: null });
    const ctx = await runMiddleware();
    expect(ctx.hubAdmin.isAdmin).toBe(false);
  });

  it("throws 401 when no cookie session resolves", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(runMiddleware()).rejects.toMatchObject({
      message: "Unauthorized",
      statusCode: 401,
    });
  });

  it("throws 401 when the session lookup errors", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad jwt" } });
    await expect(runMiddleware()).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 401 when there is no incoming request", async () => {
    getRequest.mockReturnValue(undefined);
    await expect(runMiddleware()).rejects.toMatchObject({ statusCode: 401 });
    expect(createHubSupabaseSSR).not.toHaveBeenCalled();
  });
});

describe("privileged handlers re-check the allowlist", () => {
  it("assertAdmin throws for a signed-in non-admin context", () => {
    expect(() => assertAdmin({ email: "someone@else.com" })).toThrow();
    expect(assertAdmin({ email: "alexr@globaledgemarkets.com" })).toBe(
      "alexr@globaledgemarkets.com",
    );
  });
});
