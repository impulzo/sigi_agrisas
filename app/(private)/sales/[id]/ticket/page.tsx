import type { Metadata } from "next";
import { TicketPreviewPage } from "./_blocks/TicketPreviewPage";

export const metadata: Metadata = {
  title: "Ticket de venta",
};

export default function SaleTicketRoute({ params }: { params: { id: string } }) {
  return <TicketPreviewPage id={params.id} />;
}
