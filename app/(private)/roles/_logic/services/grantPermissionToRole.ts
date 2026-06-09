import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import {
  RoleNotFoundError,
  PermissionNotFoundError,
  PermissionAlreadyGrantedError,
  ValidationError,
} from "../types/domain";

export async function grantPermissionToRole(
  roleId: string,
  permissionKey: string,
  fetchImpl = authFetch
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/roles/${roleId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionKey }),
    });
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }

  if (res.status === 409) throw new PermissionAlreadyGrantedError();
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    throw new ValidationError(body.error);
  }
  if (res.status === 404) {
    const body = await res.json().catch(() => ({ error: "" }));
    const msg = (body.error as string) ?? "";
    if (msg.toLowerCase().includes("permission")) throw new PermissionNotFoundError();
    throw new RoleNotFoundError();
  }
  if (!res.ok) throw new NetworkError();
}
