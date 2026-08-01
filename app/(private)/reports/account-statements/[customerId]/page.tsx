import type { Metadata } from "next";
import { LedgerPage } from "../../_blocks/LedgerPage";

export const metadata: Metadata = {
  title: "Estado de Cuenta · Agrisas",
};

export default function Page({ params }: { params: { customerId: string } }) {
  return <LedgerPage customerId={params.customerId} />;
}
