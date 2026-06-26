import type { InvoiceDto } from "../types/api";
import type { Invoice } from "../types/domain";

export function mapInvoiceDto(dto: InvoiceDto): Invoice {
  return {
    ...dto,
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}
