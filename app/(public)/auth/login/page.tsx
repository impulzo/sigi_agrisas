import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "../_blocks/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | Agrisas",
};

export default function LoginPage() {
  const cookieStore = cookies();
  if (cookieStore.get("refreshToken")) {
    redirect("/");
  }

  return <LoginForm />;
}
