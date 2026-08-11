import type { Metadata } from "next";
import { PurchasesReportPage } from "./_blocks/PurchasesReportPage";

export const metadata: Metadata = {
  title: "Reporte de Compras · Agrisas",
};

export default function Page() {
  return <PurchasesReportPage />;
}
