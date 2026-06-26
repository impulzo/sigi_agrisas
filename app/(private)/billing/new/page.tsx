import type { Metadata } from "next";
import { NewInvoicePage } from "../_blocks/NewInvoicePage";

export const metadata: Metadata = {
  title: "Nueva factura · Agrisas",
};

export default function Page({
  searchParams,
}: {
  searchParams?: { saleId?: string; saleLabel?: string };
}) {
  return (
    <NewInvoicePage
      initialSaleId={searchParams?.saleId}
      initialSaleLabel={searchParams?.saleLabel ? decodeURIComponent(searchParams.saleLabel) : undefined}
    />
  );
}
