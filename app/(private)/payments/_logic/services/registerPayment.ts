import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { RegisterPaymentBody } from "../types/api";
import { PaymentExceedsDueAmountError, SaleNotPayableError, FolioScopeMismatchError } from "../errors";

export async function registerPayment(
  body: RegisterPaymentBody,
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.ok) return;

  if (res.status === 409) {
    const data = await res.json() as { error: string; due?: string; message?: string };
    if (data.error === "PaymentExceedsDueAmount") {
      throw new PaymentExceedsDueAmountError(data.due ?? "0.00");
    }
    if (data.error === "SaleNotPayable") {
      throw new SaleNotPayableError({ message: data.message });
    }
  }

  if (res.status === 400) {
    const data = await res.json() as { error?: string; message?: string; expected?: string; actual?: string };
    if (data.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(data.expected ?? "", data.actual ?? "");
    throw new Error(data.message ?? "Error al registrar el abono");
  }

  throw new NetworkError();
}
