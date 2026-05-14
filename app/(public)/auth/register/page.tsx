import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterForm } from "../_blocks/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta | Agrisas",
};

export default function RegisterPage() {
  const cookieStore = cookies();
  if (cookieStore.get("refreshToken")) {
    redirect("/");
  }

  return <RegisterForm />;
}
