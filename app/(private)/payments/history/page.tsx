import type { Metadata } from "next";
import { PaymentsHistoryPage } from "../_blocks/PaymentsHistoryPage";

export const metadata: Metadata = {
  title: "Historial de abonos · Agrisas",
};

export default function Page() {
  return <PaymentsHistoryPage />;
}
