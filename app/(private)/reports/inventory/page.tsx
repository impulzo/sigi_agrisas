import type { Metadata } from "next";
import { InventoryPage } from "./_blocks/InventoryPage";

export const metadata: Metadata = {
  title: "Inventario · Agrisas",
};

export default function Page() {
  return <InventoryPage />;
}
