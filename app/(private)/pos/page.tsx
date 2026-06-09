import type { Metadata } from "next";
import { PosPage } from "./_blocks/PosPage";

export const metadata: Metadata = {
  title: "Punto de Venta",
};

export default function PosRoute() {
  return <PosPage />;
}
