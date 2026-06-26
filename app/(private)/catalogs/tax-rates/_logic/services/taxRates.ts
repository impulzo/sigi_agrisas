import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ListTaxRatesResponse, TaxRateDto, CreateTaxRateBody, UpdateTaxRateBody } from "../types/api";
import type { TaxRate } from "../types/domain";
import { TaxRateNotFoundError, TaxRateCodeAlreadyInUseError, TaxRateInUseByProductsError } from "../errors";

function toTaxRate(dto: TaxRateDto): TaxRate {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    rate: dto.rate,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function listTaxRates(
  { page, pageSize, includeInactive }: { page: number; pageSize: number; includeInactive?: boolean },
  fetchImpl = authFetch
): Promise<{ items: TaxRate[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (includeInactive) params.set("includeInactive", "true");
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/tax-rates?${params.toString()}`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  const body = (await res.json()) as ListTaxRatesResponse;
  return { items: body.items.map(toTaxRate), total: body.total, page: body.page, pageSize: body.pageSize };
}

export async function createTaxRate(
  data: CreateTaxRateBody,
  fetchImpl = authFetch
): Promise<TaxRate> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/tax-rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new TaxRateCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  return toTaxRate((await res.json()) as TaxRateDto);
}

export async function updateTaxRate(
  id: string,
  data: UpdateTaxRateBody,
  fetchImpl = authFetch
): Promise<TaxRate> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/tax-rates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new TaxRateNotFoundError();
  if (!res.ok) throw new NetworkError();
  return toTaxRate((await res.json()) as TaxRateDto);
}

export async function deactivateTaxRate(
  id: string,
  fetchImpl = authFetch
): Promise<TaxRate> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/tax-rates/${id}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new TaxRateNotFoundError();
  if (res.status === 409) {
    const body = await res.json().catch(() => ({})) as { productCount?: number };
    throw new TaxRateInUseByProductsError(body.productCount ?? 0);
  }
  if (!res.ok) throw new NetworkError();
  return toTaxRate((await res.json()) as TaxRateDto);
}
