import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Agrisas",
};

export default function DashboardPage() {
  return (
    <div className="text-center py-12">
      <h1 className="font-poppins text-2xl font-bold text-agrisas-dark">
        Dashboard placeholder
      </h1>
    </div>
  );
}
