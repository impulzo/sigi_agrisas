import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { ListSalePaymentsResponse } from "../types/api";
import type { SalePaymentsData, Payment } from "../types/domain";

function mapPaymentDto(dto: ListSalePaymentsResponse["items"][number]): Payment {
  return {
    ...dto,
    amount: parseFloat(dto.amount as unknown as string),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function listSalePayments(
  saleId: string,
  fetchImpl = authFetch,
): Promise<SalePaymentsData> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${saleId}/payments`);
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as ListSalePaymentsResponse;
  return {
    payments: body.items.map(mapPaymentDto),
    paidAmount: parseFloat(body.paidAmount as unknown as string),
    total: parseFloat(body.total as unknown as string),
    paymentStatus: body.paymentStatus,
  };
}
