import { authFetch, NetworkError, ForbiddenError } from "../../../../_lib/authFetch";
import type { ProductDto } from "../types/api";

export async function searchProductsByName(
  name: string,
  fetchImpl = authFetch,
): Promise<ProductDto[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "100",
    includeInactive: "false",
    search: name,
  });

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/products?${params.toString()}`);
  } catch (err) {
    if (err instanceof Error && (err as { isAuthError?: boolean }).isAuthError) throw err;
    throw new NetworkError();
  }

  if (res.status === 403) {
    const body = await res.json().catch(() => ({})) as { error?: { required?: string } };
    throw new ForbiddenError(body.error?.required);
  }
  if (!res.ok) throw new NetworkError();

  const body = await res.json() as { items: Array<Record<string, unknown>>; total: number };
  return body.items.map((p) => ({
    id: p.id as string,
    code: p.code as string,
    name: p.name as string,
    unit: p.unit as string,
    ivaRate: p.ivaRate as number | null,
    iepsRate: p.iepsRate as number | null,
    isActive: p.isActive as boolean,
  }));
}
