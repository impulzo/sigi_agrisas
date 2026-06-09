import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ListDepartmentsResponse, DepartmentDto } from "../types/api";
import type { Department } from "../types/domain";

function toDepartment(dto: DepartmentDto): Department {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export { toDepartment };

export async function listDepartments(
  { page, pageSize, includeInactive }: { page: number; pageSize: number; includeInactive?: boolean },
  fetchImpl = authFetch
): Promise<{ items: Department[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (includeInactive) params.set("includeInactive", "true");

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/departments?${params.toString()}`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListDepartmentsResponse;
  return {
    items: body.items.map(toDepartment),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
