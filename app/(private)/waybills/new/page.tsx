import type { Metadata } from "next";
import { NewWaybillPage } from "../_blocks/NewWaybillPage";

export const metadata: Metadata = {
  title: "Nuevo traspaso · Agrisas",
};

export default function Page() {
  return <NewWaybillPage />;
}
