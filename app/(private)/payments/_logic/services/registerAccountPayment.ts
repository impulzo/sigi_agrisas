import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { RegisterAccountPaymentBody } from "../types/api";
import {
  PaymentExceedsAccountDebtError,
  CustomerNotFoundError,
  FolioScopeMismatchError,
} from "../errors";

export async function registerAccountPayment(
  customerId: string,
  body: RegisterAccountPaymentBody,
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/customers/${customerId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.ok) return;

  if (res.status === 404) throw new CustomerNotFoundError();

  if (res.status === 409) {
    const data = await res.json() as { error: string; due?: string };
    if (data.error === "PaymentExceedsAccountDebt") {
      throw new PaymentExceedsAccountDebtError(data.due ?? "0.00");
    }
  }

  if (res.status === 400) {
    const data = await res.json() as { error?: string; message?: string; expected?: string; actual?: string };
    if (data.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(data.expected ?? "", data.actual ?? "");
    throw new Error(data.message ?? data.error ?? "Error al registrar el abono");
  }

  throw new NetworkError();
}
