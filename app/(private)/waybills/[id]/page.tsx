import type { Metadata } from "next";
import { WaybillDetailPage } from "../_blocks/WaybillDetailPage";

export const metadata: Metadata = {
  title: "Detalle de traspaso · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <WaybillDetailPage id={params.id} />;
}
