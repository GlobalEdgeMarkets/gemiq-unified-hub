import { createFileRoute } from "@tanstack/react-router";
import { IQLanding, iqHead } from "@/components/IQLanding";
import { IQ_BY_PATH } from "@/lib/iq-catalog";
import { applyIqCopy } from "@/lib/messaging";
import { getGemiqMessaging } from "@/lib/messaging.functions";

const product = IQ_BY_PATH["/productiq"];

export const Route = createFileRoute("/productiq")({
  loader: () => getGemiqMessaging(),
  head: ({ loaderData }) => iqHead(applyIqCopy(product, loaderData)),
  component: Page,
});

function Page() {
  return <IQLanding product={applyIqCopy(product, Route.useLoaderData())} />;
}
