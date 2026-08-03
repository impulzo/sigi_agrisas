import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { ListSalePaymentsResponse, LineBalanceDto } from "../types/api";
import type { SalePaymentsData, Payment, LineBalance } from "../types/domain";

function mapPaymentDto(dto: ListSalePaymentsResponse["items"][number]): Payment {
  return {
    ...dto,
    amount: parseFloat(dto.amount as unknown as string),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    items: dto.items?.map((item) => ({
      saleItemId: item.saleItemId,
      productNameSnapshot: item.productNameSnapshot,
      amount: parseFloat(item.amount),
    })),
  };
}

function mapLineBalance(dto: LineBalanceDto): LineBalance {
  return {
    saleItemId: dto.saleItemId,
    productNameSnapshot: dto.productNameSnapshot,
    lineTotal: parseFloat(dto.lineTotal),
    paidAmount: parseFloat(dto.paidAmount),
    dueAmount: parseFloat(dto.dueAmount),
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
    paidAmount: parseFloat(body.salePaidAmount as unknown as string),
    total: parseFloat(body.saleTotal as unknown as string),
    paymentStatus: body.salePaymentStatus,
    lineBalances: (body.lineBalances ?? []).map(mapLineBalance),
  };
}
