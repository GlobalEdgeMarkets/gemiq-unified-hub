import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public by design: the signed token in the email link is the authorization.
export const unsubscribeEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ e: z.string().email().max(320), t: z.string().min(10).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { unsubscribe } = await import("@/lib/hub/followups.server");
    return await unsubscribe(data.e, data.t);
  });
