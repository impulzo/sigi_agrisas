import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { ProductPriceDto } from "../types/api";

export async function getProductPrices(
  productId: string,
  fetchImpl = authFetch,
): Promise<ProductPriceDto[]> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/products/${productId}/prices`);
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const json = await res.json() as { items: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const body = Array.isArray(json) ? json : (json as { items: Array<Record<string, unknown>> }).items ?? [];
  const prices: ProductPriceDto[] = body.map((p) => ({
    id: p.id as string,
    productId: p.productId as string,
    name: p.name as string,
    price: p.price as number,
    minQuantity: p.minQuantity as number,
    discountPct: p.discountPct as number,
    isDefault: p.isDefault as boolean,
  }));

  return prices.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
}
