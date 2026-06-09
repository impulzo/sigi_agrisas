import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { PermissionDto, ListPermissionsResponse } from "../types/api";

export async function listPermissions(fetchImpl = authFetch): Promise<PermissionDto[]> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/permissions");
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListPermissionsResponse;
  return body.permissions;
}
