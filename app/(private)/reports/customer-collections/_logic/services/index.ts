import { authFetch, NetworkError } from "../../../../../_lib/authFetch";
import type { CollectionsReportDto } from "../types/api";
import type { CustomerCollectionsFilters } from "../types/domain";

const BASE = "/api/v1/admin/reports/customer-collections";

function buildParams(f: CustomerCollectionsFilters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("from", f.from);
  p.set("to", f.to);
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.customerId) p.set("customerId", f.customerId);
  return p;
}

export async function getCustomerCollectionsReport(
  filters: CustomerCollectionsFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<CollectionsReportDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${buildParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<CollectionsReportDto>;
}

async function downloadFormat(
  filters: CustomerCollectionsFilters,
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

export async function downloadCustomerCollectionsPdf(
  f: CustomerCollectionsFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(f, "pdf", fetchImpl);
}

export async function downloadCustomerCollectionsXlsx(
  f: CustomerCollectionsFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  return downloadFormat(f, "xlsx", fetchImpl);
}
