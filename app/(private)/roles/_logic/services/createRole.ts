import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { RoleAlreadyExistsError, ValidationError } from "../types/domain";
import type { CreateRolePayload, CreateRoleResponse, RoleDto } from "../types/api";

export async function createRole(
  payload: CreateRolePayload,
  fetchImpl = authFetch
): Promise<RoleDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError();
  }

  if (res.status === 409) throw new RoleAlreadyExistsError();
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    throw new ValidationError(body.error);
  }
  if (!res.ok) throw new NetworkError();

  const body = (await res.json()) as CreateRoleResponse;
  return body.role;
}
