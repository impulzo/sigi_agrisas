import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Home() {
  const refreshToken = cookies().get("refreshToken")?.value;
  redirect(refreshToken ? "/pos" : "/auth/login");
}
