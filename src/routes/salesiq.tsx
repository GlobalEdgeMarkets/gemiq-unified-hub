import { createFileRoute } from "@tanstack/react-router";
import { IQLanding, iqHead } from "@/components/IQLanding";
import { IQ_BY_PATH } from "@/lib/iq-catalog";

const product = IQ_BY_PATH["/salesiq"];

export const Route = createFileRoute("/salesiq")({
  head: () => iqHead(product),
  component: () => <IQLanding product={product} />,
});
