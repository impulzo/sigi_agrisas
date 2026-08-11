import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type {
  AccountStatementSummaryDto,
  AccountStatementLedgerDto,
} from "../types/api";
import type {
  AccountStatementsSummaryFilters,
  AccountStatementLedgerFilters,
} from "../types/domain";

const BASE = "/api/v1/admin/reports/account-statements";

function reportTooLarge(): Error {
  const e = new Error("El conjunto de datos supera 10,000 registros. Aplica más filtros.");
  e.name = "ReportTooLargeError";
  return e;
}

function summaryParams(f: AccountStatementsSummaryFilters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("page", String(f.page ?? 1));
  p.set("pageSize", String(f.pageSize ?? 20));
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.search) p.set("search", f.search);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.onlyWithBalance) p.set("onlyWithBalance", "true");
  return p;
}

function ledgerParams(f: AccountStatementLedgerFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.branchId) p.set("branchId", f.branchId);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.history === false) p.set("history", "false");
  if (f.sort && f.sort !== "date") p.set("sort", f.sort);
  return p;
}

export async function getAccountStatementsSummary(
  filters: AccountStatementsSummaryFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<AccountStatementSummaryDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${summaryParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<AccountStatementSummaryDto>;
}

export async function getAccountStatementLedger(
  customerId: string,
  filters: AccountStatementLedgerFilters & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<AccountStatementLedgerDto> {
  const { signal, ...f } = filters;
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}/${customerId}?${ledgerParams(f).toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (res.status === 404) {
    const e = new Error("Cliente no encontrado.");
    e.name = "CustomerNotFoundError";
    throw e;
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<AccountStatementLedgerDto>;
}

export async function downloadAccountStatementSummaryPdf(
  filters: AccountStatementsSummaryFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  const params = summaryParams(filters);
  params.set("format", "pdf");
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadAccountStatementLedgerPdf(
  customerId: string,
  filters: AccountStatementLedgerFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  const params = ledgerParams(filters);
  params.set("format", "pdf");
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}/${customerId}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (res.status === 409) {
    const data = (await res.json()) as { error: string };
    if (data.error === "ReportTooLarge") throw reportTooLarge();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadAccountStatementSummaryXlsx(
  filters: AccountStatementsSummaryFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  const params = summaryParams(filters);
  params.set("format", "xlsx");
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadAccountStatementLedgerXlsx(
  customerId: string,
  filters: AccountStatementLedgerFilters,
  fetchImpl = authFetch
): Promise<Blob> {
  const params = ledgerParams(filters);
  params.set("format", "xlsx");
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}/${customerId}?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }
  if (res.status === 409) {
    const data = (await res.json()) as { error: string };
    if (data.error === "ReportTooLarge") throw reportTooLarge();
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}

export async function downloadAnticipoReceiptPdf(
  customerId: string,
  paymentId: string,
  fetchImpl = authFetch
): Promise<Blob> {
  let res: Response;
  try {
    res = await fetchImpl(
      `${BASE}/${customerId}/payments/${paymentId}/receipt?format=pdf`
    );
  } catch {
    throw new NetworkError();
  }
  if (res.status === 404) {
    const e = new Error("Abono no encontrado.");
    e.name = "AnticipoNotFoundError";
    throw e;
  }
  if (!res.ok) throw new NetworkError();
  return res.blob();
}
