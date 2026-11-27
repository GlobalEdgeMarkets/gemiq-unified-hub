import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Return address check + off switch (CHECKOUT_RETURN_FLOW=off restores the old routing; absent = on). */
export const getFlowContext = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ url: z.string().max(2000).optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { safeReturnUrl } = await import("./return-url.server");
    return { url: await safeReturnUrl(data.url), flowOn: process.env["CHECKOUT_RETURN_FLOW"] !== "off" };
  });
