import type { Metadata } from "next";
import { TaxRatesPage } from "./_blocks/TaxRatesPage";

export const metadata: Metadata = {
  title: "Tasas de Impuesto | Agrisas",
};

export default function TaxRatesRoute() {
  return <TaxRatesPage />;
}
