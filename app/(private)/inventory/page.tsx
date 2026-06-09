import type { Metadata } from "next";
import { InventoryPage } from "./_blocks/InventoryPage";

export const metadata: Metadata = {
  title: "Inventario",
};

export default function InventoryRoute() {
  return <InventoryPage />;
}
