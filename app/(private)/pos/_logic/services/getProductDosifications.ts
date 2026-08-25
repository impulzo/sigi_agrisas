import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { DosificationOptionDto } from "../types/api";
import { isOnline } from "../../../../_lib/offline/connectivity";
import { getProductDosificationsFromCache } from "../../../../_lib/offline/catalogCache";

export async function getProductDosifications(
  productId: string,
  fetchImpl = authFetch,
): Promise<DosificationOptionDto[]> {
  if (!isOnline()) return getProductDosificationsFromCache(productId);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/products/${productId}/dosifications`);
  } catch (err) {
    if (err instanceof NetworkError) return getProductDosificationsFromCache(productId);
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const json = (await res.json()) as { items: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const body = Array.isArray(json) ? json : (json as { items: Array<Record<string, unknown>> }).items ?? [];
  return body.map((d) => ({
    id: d.id as string,
    productId: d.productId as string,
    name: d.name as string,
    numParts: d.numParts as number,
    isActive: d.isActive as boolean,
    computedUnitPrice: d.computedUnitPrice as number | null,
    requiresDefaultPrice: d.requiresDefaultPrice as boolean,
  }));
}
