import type { Metadata } from "next";
import { CashCutPage } from "./_blocks/CashCutPage";

export const metadata: Metadata = {
  title: "Corte de Caja (Cobranza) · Agrisas",
};

export default function Page() {
  return <CashCutPage />;
}
