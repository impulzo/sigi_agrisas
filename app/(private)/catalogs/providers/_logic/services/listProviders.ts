import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ListProvidersResponse, ListProvidersParams, ProviderDto } from "../types/api";
import type { Provider } from "../types/domain";

export function toProvider(dto: ProviderDto): Provider {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    rfc: dto.rfc,
    legalName: dto.legalName,
    taxRegime: dto.taxRegime,
    cfdiUse: dto.cfdiUse,
    taxZipCode: dto.taxZipCode,
    email: dto.email,
    phone: dto.phone,
    address: dto.address,
    contactName: dto.contactName,
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function listProviders(
  { page, pageSize, includeInactive, search }: ListProvidersParams,
  fetchImpl = authFetch,
  signal?: AbortSignal,
): Promise<{ items: Provider[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (includeInactive) params.set("includeInactive", "true");
  const trimmed = search?.trim();
  if (trimmed && trimmed.length >= 2) params.set("search", trimmed);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/providers?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListProvidersResponse;
  return {
    items: body.items.map(toProvider),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
