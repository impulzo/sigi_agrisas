import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Departamentos | Agrisas",
};

export default function DepartmentsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
