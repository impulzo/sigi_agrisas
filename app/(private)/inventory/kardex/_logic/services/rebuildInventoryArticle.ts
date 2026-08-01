import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { RebuildInventoryArticleDto } from "../types/api";

export async function rebuildInventoryArticle(
  params: { productId: string; branchId: string },
  fetchImpl = authFetch
): Promise<RebuildInventoryArticleDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/inventory/kardex/rebuild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<RebuildInventoryArticleDto>;
}
