import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clientes | Agrisas",
};

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
