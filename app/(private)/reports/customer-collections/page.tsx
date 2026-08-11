import type { Metadata } from "next";
import { CustomerCollectionsPage } from "./_blocks/CustomerCollectionsPage";

export const metadata: Metadata = {
  title: "Cobranza por Cliente · Agrisas",
};

export default function Page() {
  return <CustomerCollectionsPage />;
}
