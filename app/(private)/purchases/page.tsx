import type { Metadata } from "next";
import { PurchasesListPage } from "./_blocks/PurchasesListPage";

export const metadata: Metadata = {
  title: "Compras · Agrisas",
};

export default function Page() {
  return <PurchasesListPage />;
}
