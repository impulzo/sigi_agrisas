import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles | Agrisas",
};

export default function RolesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
