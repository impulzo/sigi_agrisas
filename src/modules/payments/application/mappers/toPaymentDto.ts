import { CustomerPayment } from "../../domain/entities/CustomerPayment";
import { PaymentDto, PaymentDetailDto, PaymentHistoryRowDto, AccountDebtDto } from "../dto/PaymentDto";
import { PaymentWithSale, PaymentHistoryItem, AccountDebtSummary } from "../ports/PaymentRepository";
import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";

interface JoinedFields {
  saleFolioCode: string | null;
  customerName: string;
  userName: string;
  branchName: string;
  paymentMethodCode: string;
  saleTotal: number | null;
  salePaidAmount: number | null;
  salePaymentStatus: SalePaymentStatus | null;
}

function saleDueAmount(saleTotal: number | null, salePaidAmount: number | null): string | null {
  if (saleTotal === null || salePaidAmount === null) return null;
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
    saleTotal: joined.saleTotal !== null ? joined.saleTotal.toFixed(4) : null,
    salePaidAmount: joined.salePaidAmount !== null ? joined.salePaidAmount.toFixed(4) : null,
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
    saleTotal: item.saleTotal !== null ? item.saleTotal.toFixed(4) : null,
    salePaidAmount: item.salePaidAmount !== null ? item.salePaidAmount.toFixed(4) : null,
    salePaymentStatus: item.salePaymentStatus,
    saleDueAmount: saleDueAmount(item.saleTotal, item.salePaidAmount),
  };
}

export function toPaymentDetailDto(data: PaymentWithSale, joined: JoinedFields): PaymentDetailDto {
  return {
    ...toPaymentDto(data.payment, joined),
    sale: data.sale
      ? {
          id: data.sale.id,
          folioCode: data.sale.folioCode,
          folioNumber: data.sale.folioNumber,
          total: data.sale.total.toFixed(4),
          paidAmount: data.sale.paidAmount.toFixed(4),
          paymentStatus: data.sale.paymentStatus,
        }
      : null,
  };
}

export function toAccountDebtDto(data: AccountDebtSummary): AccountDebtDto {
  return {
    currentBalance: data.currentBalance.toFixed(4),
    pendingSales: data.pendingSales.map((s) => ({
      saleId: s.saleId,
      folioCode: s.folioCode,
      total: s.total.toFixed(4),
      paidAmount: s.paidAmount.toFixed(4),
      due: s.due.toFixed(4),
      createdAt: s.createdAt.toISOString(),
    })),
    accountDebt: data.accountDebt.toFixed(4),
  };
}
