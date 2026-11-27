import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Server check of a return address against the live app registry. Returns the safe URL or null. */
export const checkReturnUrlFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ url: z.string().max(2000).optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { safeReturnUrl } = await import("./return-url.server");
    return { url: await safeReturnUrl(data.url) };
  });
