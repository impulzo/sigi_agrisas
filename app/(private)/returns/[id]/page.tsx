import type { Metadata } from "next";
import { ReturnDetailPage } from "../_blocks/ReturnDetailPage";

export const metadata: Metadata = {
  title: "Detalle de devolución · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <ReturnDetailPage id={params.id} />;
}
