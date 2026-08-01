import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import { buildKardexParams } from "./getKardex";
import type { KardexFilters } from "../types/domain";

export async function downloadKardexPdf(filters: KardexFilters, fetchImpl = authFetch): Promise<Blob> {
  const params = buildKardexParams(filters);
  params.set("format", "pdf");

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/inventory/kardex?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}
