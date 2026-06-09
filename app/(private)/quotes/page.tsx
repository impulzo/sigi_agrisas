import type { Metadata } from "next";
import { QuotesListPage } from "./_blocks/QuotesListPage";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

export default function QuotesRoute() {
  return <QuotesListPage />;
}
