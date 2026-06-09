import type { Metadata } from "next";
import { EditSalePage } from "../../_blocks/EditSalePage";

export const metadata: Metadata = {
  title: "Editar venta",
};

export default function EditSaleRoute({ params }: { params: { id: string } }) {
  return <EditSalePage id={params.id} />;
}
