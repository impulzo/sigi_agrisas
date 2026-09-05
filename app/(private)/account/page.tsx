import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountPage } from "./_blocks/AccountPage";

export default function AccountPageRoute() {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (!refreshToken) {
    redirect("/auth/login");
  }

  return <AccountPage />;
}
