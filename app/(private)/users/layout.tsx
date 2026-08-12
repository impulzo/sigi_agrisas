import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usuarios | Agrisas",
};

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
