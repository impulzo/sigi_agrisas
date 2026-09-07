import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "./_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar";
import { SpeedInsightsTracker } from "./_components/organisms/SpeedInsightsTracker/SpeedInsightsTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Agrisas Panel",
  description: "Panel de gestión Agrisas",
  icons: {
    icon: "/logo.png",
  },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#77574d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isProduction = process.env.VERCEL_ENV === "production";

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-inter`} suppressHydrationWarning>
        <ServiceWorkerRegistrar />
        <SpeedInsightsTracker enabled={isProduction} debug={!isProduction} />
        {children}
      </body>
    </html>
  );
}
