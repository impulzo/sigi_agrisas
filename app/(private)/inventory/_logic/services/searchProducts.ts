import { authFetch } from "../../../../_lib/authFetch";
import { requestJson } from "../../../../_lib/http/requestJson";

export interface ProductOption {
  id: string;
  code: string;
  name: string;
}

/** Búsqueda de productos para el quick-picker de "Asignar producto". Falla en silencio (lista vacía) ante error de red, igual que el comportamiento original del bloque. */
export async function searchProducts(search: string, fetchImpl = authFetch): Promise<ProductOption[]> {
  const trimmed = search.trim();
  if (trimmed.length < 2) return [];

  try {
    const body = await requestJson<{ items: ProductOption[] }>(
      `/api/v1/admin/products?pageSize=20&search=${encodeURIComponent(trimmed)}`,
      fetchImpl
    );
    return body.items.map((p) => ({ id: p.id, code: p.code, name: p.name }));
  } catch {
    return [];
  }
}
