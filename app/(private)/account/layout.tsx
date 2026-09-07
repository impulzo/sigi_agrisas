import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi cuenta | Agrisas",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
