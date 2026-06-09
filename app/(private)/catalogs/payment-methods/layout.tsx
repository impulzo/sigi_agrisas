import { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Formas de pago | Agrisas",
};

export default function PaymentMethodsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
