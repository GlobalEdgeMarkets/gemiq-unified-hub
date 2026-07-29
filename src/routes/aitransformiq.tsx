import { createFileRoute } from "@tanstack/react-router";
import { IQLanding, iqHead } from "@/components/IQLanding";
import { IQ_BY_PATH } from "@/lib/iq-catalog";

const product = IQ_BY_PATH["/aitransformiq"];

export const Route = createFileRoute("/aitransformiq")({
  head: () => iqHead(product),
  component: () => <IQLanding product={product} />,
});
