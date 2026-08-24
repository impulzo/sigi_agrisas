import { authFetch, NetworkError, ForbiddenError } from "../../../../_lib/authFetch";
import type { ProductDto } from "../types/api";
import { SaleScopingForbiddenError } from "../errors";
import { isOnline } from "../../../../_lib/offline/connectivity";
import { searchProductsFromCache } from "../../../../_lib/offline/catalogCache";

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

  if (!isOnline() && branchId) {
    const items = await searchProductsFromCache(branchId, search);
    return { items, total: items.length, page: 1, pageSize: items.length || pageSize };
  }

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/products?${params.toString()}`, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    if (err instanceof NetworkError && branchId) {
      const items = await searchProductsFromCache(branchId, search);
      return { items, total: items.length, page: 1, pageSize: items.length || pageSize };
    }
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
    departmentName: item.departmentName as string | undefined,
    createdAt: new Date(item.createdAt as string),
    updatedAt: new Date(item.updatedAt as string),
    stock: item.stock as number | null,
  }));

  return { items, total: body.total, page: body.page, pageSize: body.pageSize };
}
