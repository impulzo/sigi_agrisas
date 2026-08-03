import type { Metadata } from "next";
import { PurchaseDetailPage } from "../_blocks/PurchaseDetailPage";

export const metadata: Metadata = {
  title: "Detalle de compra · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <PurchaseDetailPage id={params.id} />;
}
