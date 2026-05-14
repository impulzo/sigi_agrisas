import { ReactNode } from "react";
import { Header } from "../../_components/organisms/Header/Header";
import { Footer } from "../../_components/organisms/Footer/Footer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-6">{children}</main>
      <Footer />
    </div>
  );
}
