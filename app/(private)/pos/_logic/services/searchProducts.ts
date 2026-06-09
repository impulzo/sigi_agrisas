import { authFetch, NetworkError, ForbiddenError } from "../../../../_lib/authFetch";
import type { ProductDto } from "../types/api";
import { SaleScopingForbiddenError } from "../errors";

export interface SearchProductsParams {
  search?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export async function searchProducts(
  { search, branchId, page = 1, pageSize = 20, signal }: SearchProductsParams,
  fetchImpl = authFetch,
): Promise<{ items: ProductDto[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    includeInactive: "false",
  });
  const trimmed = search?.trim();
  if (trimmed) params.set("search", trimmed);
  if (branchId) params.set("branchId", branchId);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/products?${params.toString()}`, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (res.status === 403) throw new SaleScopingForbiddenError();

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as {
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    pageSize: number;
  };

  const items: ProductDto[] = body.items.map((item) => ({
    id: item.id as string,
    code: item.code as string,
    name: item.name as string,
    ivaRate: item.ivaRate as number | null,
    iepsRate: item.iepsRate as number | null,
    isActive: item.isActive as boolean,
    departmentId: item.departmentId as string,
    createdAt: new Date(item.createdAt as string),
    updatedAt: new Date(item.updatedAt as string),
  }));

  return { items, total: body.total, page: body.page, pageSize: body.pageSize };
}
