import type { PurchaseDto, PurchaseDetailDto, PurchaseItemDto, ProviderPaymentSummaryDto, ProviderPaymentDto } from "./types/api";
import type { Purchase, PurchaseDetail, PurchaseItem, ProviderPaymentSummary, ProviderPayment } from "./types/domain";

function mapPurchaseItemDto(dto: PurchaseItemDto): PurchaseItem {
  return {
    ...dto,
    unitCost: parseFloat(dto.unitCost),
    lineSubtotal: parseFloat(dto.lineSubtotal),
    lineTax: parseFloat(dto.lineTax),
    lineTotal: parseFloat(dto.lineTotal),
  };
}

function mapProviderPaymentSummaryDto(dto: ProviderPaymentSummaryDto): ProviderPaymentSummary {
  return {
    ...dto,
    amount: parseFloat(dto.amount),
    paidAt: new Date(dto.paidAt),
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
  };
}

export function mapPurchaseDto(dto: PurchaseDto): Purchase {
  return {
    ...dto,
    subtotal: parseFloat(dto.subtotal),
    taxTotal: parseFloat(dto.taxTotal),
    total: parseFloat(dto.total),
    paidAmount: parseFloat(dto.paidAmount),
    purchasedAt: new Date(dto.purchasedAt),
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function mapPurchaseDetailDto(dto: PurchaseDetailDto): PurchaseDetail {
  return {
    ...mapPurchaseDto(dto),
    items: dto.items.map(mapPurchaseItemDto),
    providerPayments: dto.providerPayments.map(mapProviderPaymentSummaryDto),
  };
}

export function mapProviderPaymentDto(dto: ProviderPaymentDto): ProviderPayment {
  return {
    ...dto,
    amount: parseFloat(dto.amount),
    paidAt: new Date(dto.paidAt),
    cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : null,
    purchase: {
      ...dto.purchase,
      total: parseFloat(dto.purchase.total),
      paidAmount: parseFloat(dto.purchase.paidAmount),
    },
  };
}
