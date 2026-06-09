import type { Metadata } from "next";
import { SaleDetailPage } from "../_blocks/SaleDetailPage";

export const metadata: Metadata = {
  title: "Detalle de venta",
};

export default function SaleDetailRoute({ params }: { params: { id: string } }) {
  return <SaleDetailPage id={params.id} />;
}
