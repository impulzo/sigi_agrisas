import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sucursales | Agrisas",
};

export default function BranchesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
