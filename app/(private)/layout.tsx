import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NavigationRail } from "../_components/organisms/NavigationRail/NavigationRail";
import { TopAppBar } from "../_components/organisms/TopAppBar/TopAppBar";
import { MaterialSymbolsLoader } from "../_components/organisms/MaterialSymbolsLoader/MaterialSymbolsLoader";
import { SessionLifecycleProvider } from "./_blocks/SessionLifecycleProvider";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (!refreshToken) {
    redirect("/auth/login");
  }

  const hdrs = headers();
  const userEmail = hdrs.get("x-user-email") ?? "";
  const userName = userEmail ? userEmail.split("@")[0] : "Admin";

  return (
    <div className="bg-background text-on-background h-screen overflow-hidden">
      <MaterialSymbolsLoader />
      <NavigationRail />
      <TopAppBar userName={userName} userEmail={userEmail} />
      <main className="pl-[80px] pt-16 h-full overflow-y-auto">
        <SessionLifecycleProvider>{children}</SessionLifecycleProvider>
      </main>
    </div>
  );
}
