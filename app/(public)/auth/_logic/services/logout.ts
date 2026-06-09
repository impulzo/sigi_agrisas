import { authFetch, NetworkError } from "../../../../_lib/authFetch";

export async function logout(
  fetchImpl: typeof authFetch = authFetch
): Promise<void> {
  try {
    await fetchImpl("/api/v1/auth/logout", { method: "POST" });
  } catch (err) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("accessToken");
    }
    throw err instanceof NetworkError ? err : new NetworkError();
  }
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("accessToken");
  }
}
