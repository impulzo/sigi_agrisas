import { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Catálogos | Agrisas",
};

export default function CatalogsLayout({ children }: { children: ReactNode }) {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (!refreshToken) {
    redirect("/auth/login");
  }

  return (
    <div className="px-gutter py-lg max-w-screen-2xl mx-auto">
      {children}
    </div>
  );
}
