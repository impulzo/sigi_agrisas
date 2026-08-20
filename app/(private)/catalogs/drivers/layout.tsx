import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operadores | Agrisas",
};

export default function DriversLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
