import type { Metadata } from "next";
import { CsdManagerPage } from "../_blocks/CsdManagerPage";

export const metadata: Metadata = {
  title: "CSD · Facturación · Agrisas",
};

export default function Page() {
  return <CsdManagerPage />;
}
