import { createFileRoute } from "@tanstack/react-router";
import { IQLanding, iqHead } from "@/components/IQLanding";
import { IQ_BY_PATH } from "@/lib/iq-catalog";

const product = IQ_BY_PATH["/gtmiq"];

export const Route = createFileRoute("/gtmiq")({
  head: () => iqHead(product),
  component: () => <IQLanding product={product} />,
});
