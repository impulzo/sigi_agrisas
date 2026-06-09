import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { PaymentDetailDto } from "../types/api";
import type { PaymentDetail } from "../types/domain";

function mapPaymentDetailDto(dto: PaymentDetailDto): PaymentDetail {
  return {
    ...dto,
    amount: parseFloat(dto.amount as unknown as string),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
  };
}

export async function getPayment(
  id: string,
  fetchImpl = authFetch,
): Promise<PaymentDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/payments/${id}`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new Error("Abono no encontrado");
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as PaymentDetailDto;
  return mapPaymentDetailDto(dto);
}
