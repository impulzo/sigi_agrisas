import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { RoleDto, ListRolesResponse } from "../types/api";

export async function listRoles(fetchImpl = authFetch): Promise<RoleDto[]> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/roles");
  } catch (err) {
    if (err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListRolesResponse;
  return body.roles;
}
