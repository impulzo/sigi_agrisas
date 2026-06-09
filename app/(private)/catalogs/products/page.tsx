import type { Metadata } from "next";
import { ProductsPage } from "./_blocks/ProductsPage";

export const metadata: Metadata = {
  title: "Productos",
};

export default function ProductsRoute() {
  return <ProductsPage />;
}
