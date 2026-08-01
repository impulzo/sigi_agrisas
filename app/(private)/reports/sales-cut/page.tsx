import type { Metadata } from "next";
import { SalesCutPage } from "./_blocks/SalesCutPage";

export const metadata: Metadata = {
  title: "Corte de Ventas · Agrisas",
};

export default function Page() {
  return <SalesCutPage />;
}
