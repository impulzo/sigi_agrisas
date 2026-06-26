import type { Metadata } from "next";
import { InvoiceDetailPage } from "../_blocks/InvoiceDetailPage";

export const metadata: Metadata = {
  title: "Factura · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <InvoiceDetailPage id={params.id} />;
}
