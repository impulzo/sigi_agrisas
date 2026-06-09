import type { Metadata } from "next";
import { SalesListPage } from "./_blocks/SalesListPage";

export const metadata: Metadata = {
  title: "Ventas",
};

export default function SalesRoute() {
  return <SalesListPage />;
}
