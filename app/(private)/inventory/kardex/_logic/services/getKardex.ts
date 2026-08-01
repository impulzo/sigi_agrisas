import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { KardexReportDto } from "../types/api";
import type { KardexFilters } from "../types/domain";

export function buildKardexParams(filters: KardexFilters): URLSearchParams {
  const params = new URLSearchParams({
    productId: filters.productId,
    from: filters.from,
    to: filters.to,
  });
  if (filters.branchId) params.set("branchId", filters.branchId);
  return params;
}

export async function getKardex(
  filters: KardexFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<KardexReportDto> {
  const { signal, ...f } = filters;
  const params = buildKardexParams(f);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/inventory/kardex?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (res.status === 404) {
    const data = (await res.json()) as { error: string };
    throw new Error(data.error ?? "Producto no encontrado");
  }

  if (res.status === 409) {
    const data = (await res.json()) as { error: string };
    if (data.error === "ReportTooLarge") {
      const e = new Error("El rango seleccionado supera 10,000 movimientos. Acota las fechas.");
      e.name = "ReportTooLargeError";
      throw e;
    }
  }

  if (res.status === 400) {
    const data = (await res.json()) as { error: string };
    throw new Error(data.error ?? "Solicitud inválida");
  }

  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<KardexReportDto>;
}
