import type { Metadata } from "next";
import { ReportsHubPage } from "./_blocks/ReportsHubPage";

export const metadata: Metadata = {
  title: "Reportes · Agrisas",
};

export default function Page() {
  return <ReportsHubPage />;
}
