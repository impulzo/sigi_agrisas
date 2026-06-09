import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UsersPage } from "./_blocks/UsersPage";

export default function UsersPageRoute() {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (!refreshToken) {
    redirect("/auth/login");
  }

  return <UsersPage />;
}
