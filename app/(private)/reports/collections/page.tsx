import type { Metadata } from "next";
import { CollectionsPage } from "./_blocks/CollectionsPage";

export const metadata: Metadata = {
  title: "Cobranza · Agrisas",
};

export default function Page() {
  return <CollectionsPage />;
}
