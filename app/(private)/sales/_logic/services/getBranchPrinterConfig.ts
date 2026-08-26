import { authFetch } from "../../../../_lib/authFetch";
import type { PrinterConfigDto } from "../types/printerConfig";

const DEFAULT_PRINTER_CONFIG: PrinterConfigDto = {
  printMode: "browser",
  agentUrl: null,
  printerHost: null,
  printerPort: null,
};

/** Degrades to the browser fallback default on any fetch/permission error — never blocks printing. */
export async function getBranchPrinterConfig(branchId: string, fetchImpl: typeof authFetch = authFetch): Promise<PrinterConfigDto> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/branches/${branchId}/printer-config`);
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
  if (!res.ok) return DEFAULT_PRINTER_CONFIG;
  return res.json() as Promise<PrinterConfigDto>;
}
