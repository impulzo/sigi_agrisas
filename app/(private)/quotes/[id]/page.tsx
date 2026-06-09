import type { Metadata } from "next";
import { QuoteDetailPage } from "../_blocks/QuoteDetailPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Detalle de cotización" };
}

export default function QuoteDetailRoute({ params }: { params: { id: string } }) {
  return <QuoteDetailPage id={params.id} />;
}
