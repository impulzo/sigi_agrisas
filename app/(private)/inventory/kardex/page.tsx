import type { Metadata } from "next";
import { KardexPage } from "./_blocks/KardexPage";

export const metadata: Metadata = {
  title: "Kardex de Inventario",
};

export default function Page({
  searchParams,
}: {
  searchParams?: { productId?: string; branchId?: string };
}) {
  return (
    <KardexPage initialProductId={searchParams?.productId} initialBranchId={searchParams?.branchId} />
  );
}
