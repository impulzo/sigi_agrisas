import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehículos | Agrisas",
};

export default function VehiclesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
