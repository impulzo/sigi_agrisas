import { authFetch, NetworkError } from "../../../../_lib/authFetch";

export interface RoleOption {
  id: string;
  name: string;
}

export async function listAvailableRoles(fetchImpl = authFetch): Promise<RoleOption[]> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/roles");
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as { roles: RoleOption[] };
  return body.roles;
}
