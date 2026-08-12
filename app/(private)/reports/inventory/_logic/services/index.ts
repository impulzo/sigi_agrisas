import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { DepartmentPriceListReportDto } from "../types/api";
import type { InventoryReportFilters } from "../types/domain";

const BASE = "/api/v1/admin/reports/inventory/by-department";

function buildParams(f: InventoryReportFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.departmentId) p.set("departmentId", f.departmentId);
  if (f.branchId) p.set("branchId", f.branchId);
  return p;
}

export async function getInventoryReport(
  filters: InventoryReportFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<DepartmentPriceListReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<DepartmentPriceListReportDto>;
}

async function downloadFormat(
  filters: InventoryReportFilters,
  format: "pdf" | "xlsx",
  fetchImpl: typeof authFetch
): Promise<Blob> {
  const params = buildParams(filters);
  params.set("format", format);
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadInventoryReportPdf(
  filters: InventoryReportFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(filters, "pdf", fetchImpl);
}

export async function downloadInventoryReportXlsx(
  filters: InventoryReportFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(filters, "xlsx", fetchImpl);
}
