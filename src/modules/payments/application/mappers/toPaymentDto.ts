import { CustomerPayment } from "../../domain/entities/CustomerPayment";
import { PaymentDto, PaymentDetailDto, PaymentHistoryRowDto } from "../dto/PaymentDto";
import { PaymentWithSale, PaymentHistoryItem } from "../ports/PaymentRepository";
import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";

interface JoinedFields {
  saleFolioCode: string;
  customerName: string;
  userName: string;
  branchName: string;
  paymentMethodCode: string;
  saleTotal: number;
  salePaidAmount: number;
  salePaymentStatus: SalePaymentStatus;
}

function saleDueAmount(saleTotal: number, salePaidAmount: number): string {
  return (saleTotal - salePaidAmount).toFixed(4);
}

export function toPaymentDto(p: CustomerPayment, joined: JoinedFields): PaymentDto {
  return {
    id: p.id,
    saleId: p.saleId,
    saleFolioCode: joined.saleFolioCode,
    customerId: p.customerId,
    customerName: joined.customerName,
    userId: p.userId,
    userName: joined.userName,
    branchId: p.branchId,
    branchName: joined.branchName,
    paymentMethodId: p.paymentMethodId,
    paymentMethodCode: joined.paymentMethodCode,
    folioId: p.folioId,
    folioCode: p.folioCode,
    folioNumber: p.folioNumber,
    amount: p.amount.toFixed(4),
    status: p.status,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
    cancellationReason: p.cancellationReason,
    items: p.items.length > 0
      ? p.items.map((item) => ({
          saleItemId: item.saleItemId,
          productNameSnapshot: item.productNameSnapshot,
          amount: item.amount.toFixed(4),
        }))
      : undefined,
    saleTotal: joined.saleTotal.toFixed(4),
    salePaidAmount: joined.salePaidAmount.toFixed(4),
    salePaymentStatus: joined.salePaymentStatus,
    saleDueAmount: saleDueAmount(joined.saleTotal, joined.salePaidAmount),
  };
}

export function toPaymentHistoryRowDto(item: PaymentHistoryItem): PaymentHistoryRowDto {
  return {
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    folioCode: item.folioCode,
    saleId: item.saleId,
    saleFolioCode: item.saleFolioCode,
    customerId: item.customerId,
    customerName: item.customerName,
    userId: item.userId,
    userName: item.userName,
    branchId: item.branchId,
    branchName: item.branchName,
    paymentMethodCode: item.paymentMethodCode,
    amount: item.amount.toFixed(4),
    status: item.status,
    cancelledAt: item.cancelledAt ? item.cancelledAt.toISOString() : null,
    saleTotal: item.saleTotal.toFixed(4),
    salePaidAmount: item.salePaidAmount.toFixed(4),
    salePaymentStatus: item.salePaymentStatus,
    saleDueAmount: saleDueAmount(item.saleTotal, item.salePaidAmount),
  };
}

export function toPaymentDetailDto(data: PaymentWithSale, joined: JoinedFields): PaymentDetailDto {
  return {
    ...toPaymentDto(data.payment, joined),
    sale: {
      id: data.sale.id,
      folioCode: data.sale.folioCode,
      folioNumber: data.sale.folioNumber,
      total: data.sale.total.toFixed(4),
      paidAmount: data.sale.paidAmount.toFixed(4),
      paymentStatus: data.sale.paymentStatus,
    },
  };
}
