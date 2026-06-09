import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateDepartmentBody, DepartmentDto } from "../types/api";
import type { Department } from "../types/domain";
import { DepartmentCodeAlreadyInUseError } from "../errors";
import { toDepartment } from "./listDepartments";

export async function createDepartment(
  { body }: { body: CreateDepartmentBody },
  fetchImpl = authFetch
): Promise<Department> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new DepartmentCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as DepartmentDto;
  return toDepartment(data);
}
