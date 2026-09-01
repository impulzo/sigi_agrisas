import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { UpdatePrinterConfigBody, PrinterConfigDto } from "../types/api";
import { BranchNotFoundError, IncompletePrinterConfigError } from "../errors";

export async function updatePrinterConfig(
  { id, body }: { id: string; body: UpdatePrinterConfigBody },
  fetchImpl: typeof authFetch = authFetch,
): Promise<PrinterConfigDto> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/branches/${id}/printer-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new BranchNotFoundError();
  if (res.status === 400) throw new IncompletePrinterConfigError();
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<PrinterConfigDto>;
}
