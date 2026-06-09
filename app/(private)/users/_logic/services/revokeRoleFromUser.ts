import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { UserNotFoundError } from "../errors";

export async function revokeRoleFromUser(
  userId: string,
  roleId: string,
  fetchImpl = authFetch
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/users/${userId}/roles/${roleId}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new UserNotFoundError();
  if (res.status === 204) return;
  if (!res.ok) throw new NetworkError();
}
