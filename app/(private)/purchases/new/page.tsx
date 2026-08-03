import type { Metadata } from "next";
import { CreatePurchasePage } from "../_blocks/CreatePurchasePage";

export const metadata: Metadata = {
  title: "Nueva compra · Agrisas",
};

export default function Page() {
  return <CreatePurchasePage />;
}
