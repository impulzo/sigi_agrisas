import type { Metadata } from "next";
import { SettingsPage } from "./_blocks/SettingsPage";

export const metadata: Metadata = {
  title: "Configuración | Agrisas",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
