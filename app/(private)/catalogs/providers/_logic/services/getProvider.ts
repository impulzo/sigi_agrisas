import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { ProviderDto } from "../types/api";
import type { Provider } from "../types/domain";
import { ProviderNotFoundError } from "../errors";
import { toProvider } from "./listProviders";

export async function getProvider(
  { id }: { id: string },
  fetchImpl = authFetch,
): Promise<Provider> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/providers/${id}`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new ProviderNotFoundError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as ProviderDto;
  return toProvider(data);
}
