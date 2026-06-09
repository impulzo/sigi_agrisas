import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateFolioBody, FolioDto } from "../types/api";
import type { Folio } from "../types/domain";
import { FolioCodeAlreadyInUseError } from "../errors";
import { toFolio } from "./listFolios";

export async function createFolio(
  { body }: { body: CreateFolioBody },
  fetchImpl = authFetch
): Promise<Folio> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/folios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) throw new FolioCodeAlreadyInUseError();
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as FolioDto;
  return toFolio(data);
}
