import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { CancelPaymentBody } from "../types/api";
import { PaymentAlreadyCancelledError } from "../errors";

export async function cancelPayment(
  id: string,
  body: CancelPaymentBody = {},
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/payments/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.ok) return;

  if (res.status === 409) {
    const data = await res.json() as { error: string };
    if (data.error === "PaymentAlreadyCancelled") {
      throw new PaymentAlreadyCancelledError();
    }
  }

  throw new NetworkError();
}
