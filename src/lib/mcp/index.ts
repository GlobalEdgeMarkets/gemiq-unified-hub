import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import listSubmissionsTool from "./tools/list-submissions";
import getSubscriptionTool from "./tools/get-subscription";

// The OAuth issuer MUST be the direct Supabase host — the `.lovable.cloud`
// proxy fails RFC 8414 issuer verification. VITE_SUPABASE_PROJECT_ID is
// inlined at build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gemiq-hub-mcp",
  title: "GEM.IQ Hub",
  version: "0.1.0",
  instructions:
    "GEM.IQ Hub tools. Read the signed-in user's Hub profile, subscription status, and assessment submissions across TariffIQ, ReadinessIQ, UXIQ, and TechServicesIQ. All tools act as the authenticated user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, listSubmissionsTool, getSubscriptionTool],
});
