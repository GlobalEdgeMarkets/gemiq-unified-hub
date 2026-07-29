import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/readinessiq/$")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", statusCode: 301 });
  },
});
