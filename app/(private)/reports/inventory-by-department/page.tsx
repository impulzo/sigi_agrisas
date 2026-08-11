import type { Metadata } from "next";
import { InventoryByDepartmentPage } from "./_blocks/InventoryByDepartmentPage";

export const metadata: Metadata = {
  title: "Inventario por Departamento · Agrisas",
};

export default function Page() {
  return <InventoryByDepartmentPage />;
}
