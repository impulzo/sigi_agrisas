import type { Metadata } from "next";
import { CreateSaleWaybillPage } from "./_blocks/CreateSaleWaybillPage";

export const metadata: Metadata = {
  title: "Generar Carta Porte · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <CreateSaleWaybillPage saleId={params.id} />;
}
