import type { Metadata } from "next";
import { SetPasswordForm } from "../_blocks/SetPasswordForm";

export const metadata: Metadata = {
  title: "Establece tu contraseña | Agrisas",
};

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <SetPasswordForm token={searchParams.token ?? null} />;
}
