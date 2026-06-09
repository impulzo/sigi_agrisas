import type { Metadata } from "next";
import { PaymentsListPage } from "./_blocks/PaymentsListPage";

export const metadata: Metadata = {
  title: "Abonos · Agrisas",
};

export default function Page() {
  return <PaymentsListPage />;
}
