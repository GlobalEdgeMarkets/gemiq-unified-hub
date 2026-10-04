// Report page data. Owner or admin only; never throws for anonymous callers.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getReport = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { resolveHubAdmin } = await import("@/lib/hub/admin/resolve.server");
    const viewer = await resolveHubAdmin();
    if (!viewer) return { state: "anon" as const };
    const { loadReport } = await import("@/lib/hub/report-control.server");
    const report = await loadReport(data.id, viewer);
    if (!report) return { state: "missing" as const };
    return { state: "ok" as const, report };
  });
