import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ListDriversResponse, ListDriversParams, DriverDto } from "../types/api";
import type { Driver } from "../types/domain";

export function toDriver(dto: DriverDto): Driver {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    rfc: dto.rfc,
    licenseNumber: dto.licenseNumber,
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function listDrivers(
  { page, pageSize, includeInactive, search }: ListDriversParams,
  fetchImpl = authFetch,
  signal?: AbortSignal,
): Promise<{ items: Driver[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (includeInactive) params.set("includeInactive", "true");
  const trimmed = search?.trim();
  if (trimmed && trimmed.length >= 2) params.set("search", trimmed);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/drivers?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListDriversResponse;
  return {
    items: body.items.map(toDriver),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
