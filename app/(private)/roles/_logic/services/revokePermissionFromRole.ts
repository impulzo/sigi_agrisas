import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { RoleNotFoundError } from "../types/domain";

export async function revokePermissionFromRole(
  roleId: string,
  permId: string,
  fetchImpl = authFetch
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/roles/${roleId}/permissions/${permId}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }

  if (res.status === 404) throw new RoleNotFoundError();
  if (!res.ok) throw new NetworkError();
}
