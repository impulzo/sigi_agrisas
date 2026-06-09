import { Sale } from "../../domain/entities/Sale";
import { SaleItem } from "../../domain/entities/SaleItem";
import { SaleDto, SaleDetailDto } from "../dto/SaleDto";
import { SaleItemDto } from "../dto/SaleItemDto";

export interface SaleJoinedFields {
  branchName: string | null;
  customerName: string | null;
  customerRfc: string | null;
  cashierName: string | null;
  paymentMethodCode: string | null;
  paymentMethodIsCredit: boolean;
}

export function toSaleItemDto(it: SaleItem): SaleItemDto {
  return {
    id: it.id,
    productId: it.productId,
    productPriceId: it.productPriceId,
    productCodeSnapshot: it.productCodeSnapshot,
    productNameSnapshot: it.productNameSnapshot,
    priceNameSnapshot: it.priceNameSnapshot,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discountPct: it.discountPct,
    ivaRate: it.ivaRate,
    iepsRate: it.iepsRate,
    lineSubtotal: it.lineSubtotal,
    lineTax: it.lineTax,
    lineTotal: it.lineTotal,
  };
}

export function toSaleDto(s: Sale, joined: SaleJoinedFields): SaleDto {
  return {
    id: s.id,
    folioId: s.folioId,
    folioCode: s.folioCode,
    folioNumber: s.folioNumber,
    branchId: s.branchId,
    branchName: joined.branchName,
    customerId: s.customerId,
    customerName: joined.customerName,
    customerRfc: joined.customerRfc,
    cashierId: s.cashierId,
    cashierName: joined.cashierName,
    paymentMethodId: s.paymentMethodId,
    paymentMethodCode: joined.paymentMethodCode,
    isCredit: joined.paymentMethodIsCredit,
    quoteId: s.quoteId,
    status: s.status,
    paidAmount: s.paidAmount.toFixed(4),
    paymentStatus: s.paymentStatus,
    subtotal: s.subtotal,
    taxTotal: s.taxTotal,
    total: s.total,
    notes: s.notes,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    cancelledAt: s.cancelledAt ? s.cancelledAt.toISOString() : null,
    cancellationReason: s.cancellationReason,
    editedAt: s.editedAt ? s.editedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function toSaleDetailDto(
  s: Sale,
  joined: SaleJoinedFields,
  returnedAggregate: Record<string, number> = {}
): SaleDetailDto {
  return {
    ...toSaleDto(s, joined),
    items: s.items.map(toSaleItemDto),
    returnedQuantityBySaleItem: returnedAggregate,
  };
}
