import type { Metadata } from "next";
import { AccountStatementsPage } from "../_blocks/AccountStatementsPage";

export const metadata: Metadata = {
  title: "Estados de Cuenta · Agrisas",
};

export default function Page() {
  return <AccountStatementsPage />;
}
