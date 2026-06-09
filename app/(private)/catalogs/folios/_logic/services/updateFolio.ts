import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { UpdateFolioBody, FolioDto } from "../types/api";
import type { Folio } from "../types/domain";
import { FolioNotFoundError, FolioCodeAlreadyInUseError } from "../errors";
import { toFolio } from "./listFolios";

export async function updateFolio(
  { id, body }: { id: string; body: UpdateFolioBody },
  fetchImpl = authFetch
): Promise<Folio> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/folios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new FolioNotFoundError();
  if (res.status === 409) throw new FolioCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as FolioDto;
  return toFolio(data);
}
