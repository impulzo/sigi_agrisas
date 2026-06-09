import type { Metadata } from "next";
import { CreateReturnPage } from "./_blocks/CreateReturnPage";

export const metadata: Metadata = {
  title: "Registrar devolución · Agrisas",
};

export default function Page({ params }: { params: { id: string } }) {
  return <CreateReturnPage saleId={params.id} />;
}
