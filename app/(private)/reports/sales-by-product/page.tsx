import type { Metadata } from "next";
import { SalesByProductPage } from "./_blocks/SalesByProductPage";

export const metadata: Metadata = {
  title: "Ventas por Producto · Agrisas",
};

export default function Page() {
  return <SalesByProductPage />;
}
