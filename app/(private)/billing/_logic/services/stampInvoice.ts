import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { StampFromSaleRequest, StampStandaloneRequest, InvoiceDto } from "../types/api";
import type { Invoice } from "../types/domain";
import {
  SaleAlreadyInvoicedError,
  SaleNotInvoiceableError,
  ReceiverFiscalDataIncompleteError,
  FacturamaStampError,
  BillingForbiddenError,
} from "../errors";
import { mapInvoiceDto } from "./_mappers";

export async function stampInvoice(
  payload: StampFromSaleRequest | StampStandaloneRequest,
  fetchImpl = authFetch,
): Promise<Invoice> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (res.status === 409) {
    const body = await res.json() as { error: string; invoiceId?: string };
    if (body.error === "SaleAlreadyInvoiced" && body.invoiceId) {
      throw new SaleAlreadyInvoicedError(body.invoiceId);
    }
    throw new SaleNotInvoiceableError();
  }

  if (res.status === 400) {
    const body = await res.json() as { error: string; missingFields?: string[] };
    if (body.error === "ReceiverFiscalDataIncomplete") {
      throw new ReceiverFiscalDataIncompleteError(body.missingFields ?? []);
    }
    throw new NetworkError();
  }

  if (res.status === 422) {
    const body = await res.json() as { error: string; detail?: string };
    throw new FacturamaStampError(body.detail ?? body.error);
  }

  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as InvoiceDto;
  return mapInvoiceDto(dto);
}
