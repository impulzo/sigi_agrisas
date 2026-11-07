import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { AccountDebtDto } from "../types/api";
import type { AccountDebt } from "../types/domain";

function mapAccountDebtDto(dto: AccountDebtDto): AccountDebt {
  return {
    currentBalance: parseFloat(dto.currentBalance),
    pendingSales: dto.pendingSales.map((s) => ({
      saleId: s.saleId,
      folioCode: s.folioCode,
      total: parseFloat(s.total),
      paidAmount: parseFloat(s.paidAmount),
      due: parseFloat(s.due),
      createdAt: new Date(s.createdAt),
    })),
    accountDebt: parseFloat(dto.accountDebt),
  };
}

export async function getCustomerAccountDebt(
  customerId: string,
  fetchImpl = authFetch,
): Promise<AccountDebt> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/customers/${customerId}/payments`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new Error("Cliente no encontrado");
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as AccountDebtDto;
  return mapAccountDebtDto(dto);
}
