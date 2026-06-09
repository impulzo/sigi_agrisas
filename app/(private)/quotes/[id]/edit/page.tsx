import type { Metadata } from "next";
import { QuoteEditPage } from "../../_blocks/QuoteEditPage";

export const metadata: Metadata = {
  title: "Editar cotización",
};

export default function QuoteEditRoute({ params }: { params: { id: string } }) {
  return <QuoteEditPage id={params.id} />;
}
