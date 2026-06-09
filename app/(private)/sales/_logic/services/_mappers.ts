import type { ListSalesResponse, SaleDetailDto } from "../types/api";
import type { SaleDetail, SaleSummary } from "../types/domain";

export function toSaleSummary(dto: ListSalesResponse["items"][number]): SaleSummary {
  return {
    ...dto,
    paidAmount: parseFloat(dto.paidAmount as unknown as string),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function toSaleDetail(dto: SaleDetailDto): SaleDetail {
  return {
    ...dto,
    paidAmount: parseFloat(dto.paidAmount as unknown as string),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
    editedAt: dto.editedAt ? new Date(dto.editedAt) : null,
  };
}
