import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RolesPage } from "./_blocks/RolesPage";

export default function RolesPageRoute() {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (!refreshToken) {
    redirect("/auth/login");
  }

  return <RolesPage />;
}
