import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ListVehiclesResponse, ListVehiclesParams, VehicleDto } from "../types/api";
import type { Vehicle } from "../types/domain";

export function toVehicle(dto: VehicleDto): Vehicle {
  return {
    id: dto.id,
    code: dto.code,
    plate: dto.plate,
    vehicleConfig: dto.vehicleConfig,
    permitType: dto.permitType,
    permitNumber: dto.permitNumber,
    insuranceCompany: dto.insuranceCompany,
    insurancePolicy: dto.insurancePolicy,
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function listVehicles(
  { page, pageSize, includeInactive, search }: ListVehiclesParams,
  fetchImpl = authFetch,
  signal?: AbortSignal,
): Promise<{ items: Vehicle[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (includeInactive) params.set("includeInactive", "true");
  const trimmed = search?.trim();
  if (trimmed && trimmed.length >= 2) params.set("search", trimmed);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/vehicles?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListVehiclesResponse;
  return {
    items: body.items.map(toVehicle),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
