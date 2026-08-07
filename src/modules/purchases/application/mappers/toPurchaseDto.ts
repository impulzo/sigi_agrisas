import { Purchase } from "../../domain/entities/Purchase";
import { PurchaseItem } from "../../domain/entities/PurchaseItem";
import { ProviderPayment } from "../../domain/entities/ProviderPayment";
import { PurchaseDto, PurchaseDetailDto, PurchaseItemDto, ProviderPaymentSummaryDto } from "../dto/PurchaseDto";
import { PurchaseJoinedFields } from "../ports/PurchaseRepository";

export function toPurchaseItemDto(item: PurchaseItem): PurchaseItemDto {
  return {
    id: item.id,
    purchaseId: item.purchaseId,
    productId: item.productId,
    productCodeSnapshot: item.productCodeSnapshot,
    productNameSnapshot: item.productNameSnapshot,
    quantity: item.quantity,
    unitCost: item.unitCost.toFixed(4),
    discountPct: item.discountPct,
    ivaRate: item.ivaRate,
    iepsRate: item.iepsRate,
    lineSubtotal: item.lineSubtotal.toFixed(4),
    lineTax: item.lineTax.toFixed(4),
    lineTotal: item.lineTotal.toFixed(4),
  };
}

export function toProviderPaymentSummaryDto(payment: ProviderPayment): ProviderPaymentSummaryDto {
  return {
    id: payment.id,
    folioCode: payment.folioCode,
    folioNumber: payment.folioNumber,
    amount: payment.amount.toFixed(4),
    status: payment.status,
    paidAt: payment.paidAt.toISOString(),
    cancelledAt: payment.cancelledAt?.toISOString() ?? null,
    cancellationReason: payment.cancellationReason,
  };
}

export function toPurchaseDto(purchase: Purchase, joined: PurchaseJoinedFields): PurchaseDto {
  return {
    id: purchase.id,
    providerId: purchase.providerId,
    providerName: joined.providerName,
    providerRfc: joined.providerRfc,
    branchId: purchase.branchId,
    branchName: joined.branchName,
    paymentMethodId: purchase.paymentMethodId,
    paymentMethodCode: joined.paymentMethodCode,
    paymentMethodIsCredit: joined.paymentMethodIsCredit,
    creatorId: purchase.creatorId,
    creatorName: joined.creatorName,
    folioId: purchase.folioId,
    folioNumber: purchase.folioNumber,
    folioCode: purchase.folioCode,
    status: purchase.status,
    subtotal: purchase.subtotal.toFixed(4),
    taxTotal: purchase.taxTotal.toFixed(4),
    total: purchase.total.toFixed(4),
    paidAmount: purchase.paidAmount.toFixed(4),
    paymentStatus: purchase.paymentStatus,
    notes: purchase.notes,
    purchasedAt: purchase.purchasedAt.toISOString(),
    satUuid: purchase.satUuid,
    supplierInvoiceNumber: purchase.supplierInvoiceNumber,
    invoiceDate: purchase.invoiceDate?.toISOString() ?? null,
    xmlFileName: purchase.xmlFileName,
    cancelledAt: purchase.cancelledAt?.toISOString() ?? null,
    cancelledBy: purchase.cancelledBy,
    cancellationReason: purchase.cancellationReason,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
  };
}

export function toPurchaseDetailDto(
  purchase: Purchase,
  items: PurchaseItem[],
  providerPayments: ProviderPayment[],
  joined: PurchaseJoinedFields
): PurchaseDetailDto {
  return {
    ...toPurchaseDto(purchase, joined),
    items: items.map(toPurchaseItemDto),
    providerPayments: providerPayments.map(toProviderPaymentSummaryDto),
  };
}
