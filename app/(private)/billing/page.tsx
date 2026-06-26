import type { Metadata } from "next";
import { BillingListPage } from "./_blocks/BillingListPage";

export const metadata: Metadata = {
  title: "Facturación · Agrisas",
};

export default function Page() {
  return <BillingListPage />;
}
