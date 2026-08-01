import type { Metadata } from "next";
import { WaybillsListPage } from "./_blocks/WaybillsListPage";

export const metadata: Metadata = {
  title: "Traspasos · Agrisas",
};

export default function Page() {
  return <WaybillsListPage />;
}
