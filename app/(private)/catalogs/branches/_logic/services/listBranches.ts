import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ListBranchesResponse, BranchDto } from "../types/api";
import type { Branch } from "../types/domain";

function toBranch(dto: BranchDto): Branch {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    address: dto.address,
    phone: dto.phone,
    email: dto.email,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export { toBranch };

export async function listBranches(
  { page, pageSize, includeInactive }: { page: number; pageSize: number; includeInactive?: boolean },
  fetchImpl = authFetch
): Promise<{ items: Branch[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (includeInactive) params.set("includeInactive", "true");

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/branches?${params.toString()}`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListBranchesResponse;
  return {
    items: body.items.map(toBranch),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
