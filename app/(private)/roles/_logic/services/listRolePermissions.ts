import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { PermissionDto, ListRolePermissionsResponse } from "../types/api";

export async function listRolePermissions(roleId: string, fetchImpl = authFetch): Promise<PermissionDto[]> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/roles/${roleId}/permissions`);
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListRolePermissionsResponse;
  return body.permissions;
}
