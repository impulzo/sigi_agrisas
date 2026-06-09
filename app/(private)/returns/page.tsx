import type { Metadata } from "next";
import { ReturnsListPage } from "./_blocks/ReturnsListPage";

export const metadata: Metadata = {
  title: "Devoluciones · Agrisas",
};

export default function Page() {
  return <ReturnsListPage />;
}
