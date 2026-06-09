import type { Metadata } from "next";
import { PaymentDetailPage } from "../_blocks/PaymentDetailPage";

export const metadata: Metadata = {
  title: "Abono · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <PaymentDetailPage id={params.id} />;
}
