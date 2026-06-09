import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Folios | Agrisas",
};

export default function FoliosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
