import { CustomerPayment } from "../../domain/entities/CustomerPayment";
import { PaymentDto, PaymentDetailDto } from "../dto/PaymentDto";
import { PaymentWithSale } from "../ports/PaymentRepository";

interface JoinedFields {
  saleFolioCode: string;
  customerName: string;
  userName: string;
  branchName: string;
  paymentMethodCode: string;
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
