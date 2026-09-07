import { authFetch } from "../../../../_lib/authFetch";
import { requestJson } from "../../../../_lib/http/requestJson";

export interface SaleOption {
  id: string;
  folioLabel: string;
  customerId: string | null;
  customerName: string | null;
  total: number;
}

interface SaleSearchRow {
  id: string;
  folioPrefix?: string | null;
  folioNumber: number;
  customerId?: string | null;
  customerName?: string | null;
  total: number;
}

/** Búsqueda de ventas para el quick-picker de "Facturar venta". Falla en silencio (lista vacía) ante error de red, igual que el comportamiento original del bloque. */
export async function searchSales(search: string, fetchImpl = authFetch): Promise<SaleOption[]> {
  if (search.length < 2) return [];
  const params = new URLSearchParams({ search, status: "completed", pageSize: "20" });

  let body: { items: SaleSearchRow[] };
  try {
    body = await requestJson<{ items: SaleSearchRow[] }>(`/api/v1/admin/sales?${params.toString()}`, fetchImpl);
  } catch {
    return [];
  }
  return body.items.map((s) => ({
    id: s.id,
    folioLabel: s.folioPrefix ? `${s.folioPrefix}-${s.folioNumber}` : String(s.folioNumber),
    customerId: s.customerId ?? null,
    customerName: s.customerName ?? null,
    total: s.total,
  }));
}
