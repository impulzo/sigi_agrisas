import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { ReturnDetailDto } from "../types/api";
import type { ReturnDetail } from "../types/domain";
import { ReturnNotFoundError, ReturnReadForbiddenError, ReturnScopingForbiddenError } from "../errors";
import { mapReturnDetailDto } from "../_mappers";

export async function getReturn(id: string, fetchImpl = authFetch): Promise<ReturnDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/returns/${id}`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new ReturnScopingForbiddenError();
      throw new ReturnReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (res.status === 404) throw new ReturnNotFoundError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as ReturnDetailDto;
  return mapReturnDetailDto(dto);
}
