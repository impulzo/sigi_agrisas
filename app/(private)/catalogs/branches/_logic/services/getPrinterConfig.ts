import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { PrinterConfigDto } from "../types/api";
import { BranchNotFoundError } from "../errors";

/** Sin fallback silencioso — propaga el error real, a diferencia de sales/_logic/services/getBranchPrinterConfig.ts (usado por el flujo de impresión). */
export async function getPrinterConfig(branchId: string, fetchImpl: typeof authFetch = authFetch): Promise<PrinterConfigDto> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/branches/${branchId}/printer-config`);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new BranchNotFoundError();
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<PrinterConfigDto>;
}
