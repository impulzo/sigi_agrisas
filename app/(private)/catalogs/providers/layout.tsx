import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proveedores | Agrisas",
};

export default function ProvidersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
