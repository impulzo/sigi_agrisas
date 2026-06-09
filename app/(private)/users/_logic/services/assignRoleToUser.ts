import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { UserNotFoundError } from "../errors";

export async function assignRoleToUser(
  userId: string,
  roleName: string,
  fetchImpl = authFetch
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/users/${userId}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleName }),
    });
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new UserNotFoundError();
  if (!res.ok && res.status !== 201) throw new NetworkError();
}
