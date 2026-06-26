import { authFetch } from "../../../../../_lib/authFetch";

export async function deleteProductImage(
  productId: string,
  fetchImpl: typeof authFetch = authFetch,
): Promise<void> {
  const res = await fetchImpl(`/api/v1/admin/products/${productId}/image`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Error al eliminar imagen.");
  }
}
