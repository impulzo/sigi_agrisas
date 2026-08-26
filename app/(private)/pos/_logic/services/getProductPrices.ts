import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { ProductPriceDto } from "../types/api";
import { isOnline } from "../../../../_lib/offline/connectivity";
import { getProductPricesFromCache } from "../../../../_lib/offline/catalogCache";

export async function getProductPrices(
  productId: string,
  branchId?: string | null,
  fetchImpl = authFetch,
): Promise<ProductPriceDto[]> {
  if (!isOnline()) return getProductPricesFromCache(productId);

  const url = branchId
    ? `/api/v1/admin/products/${productId}/prices?branchId=${branchId}`
    : `/api/v1/admin/products/${productId}/prices`;

  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch (err) {
    if (err instanceof NetworkError) return getProductPricesFromCache(productId);
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const json = await res.json() as { items: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const body = Array.isArray(json) ? json : (json as { items: Array<Record<string, unknown>> }).items ?? [];
  return body.map((p) => ({
    id: p.id as string,
    productId: p.productId as string,
    name: p.name as string,
    price: p.price as number,
    minQuantity: p.minQuantity as number,
    discountPct: p.discountPct as number,
    isDefault: p.isDefault as boolean,
  }));
}
