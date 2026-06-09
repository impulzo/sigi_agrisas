import type { Metadata } from "next";
import { QuoteCreatePage } from "../_blocks/QuoteCreatePage";

export const metadata: Metadata = {
  title: "Nueva cotización",
};

export default function QuoteNewRoute() {
  return <QuoteCreatePage />;
}
