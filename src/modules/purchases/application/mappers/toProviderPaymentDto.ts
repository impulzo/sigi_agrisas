import { ProviderPayment } from "../../domain/entities/ProviderPayment";
import { ProviderPaymentDto, ProviderPaymentDetailDto } from "../dto/ProviderPaymentDto";
import { ProviderPaymentJoinedFields, ProviderPaymentPurchaseFields } from "../ports/ProviderPaymentRepository";

export function toProviderPaymentDto(
  payment: ProviderPayment,
  joined: ProviderPaymentJoinedFields
): ProviderPaymentDto {
  return {
    id: payment.id,
    purchaseId: payment.purchaseId,
    purchaseFolioCode: joined.purchaseFolioCode,
    providerId: payment.providerId,
    providerName: joined.providerName,
    branchId: payment.branchId,
    branchName: joined.branchName,
    folioId: payment.folioId,
    folioNumber: payment.folioNumber,
    folioCode: payment.folioCode,
    creatorId: payment.creatorId,
    creatorName: joined.creatorName,
    amount: payment.amount.toFixed(4),
    status: payment.status,
    notes: payment.notes,
    paidAt: payment.paidAt.toISOString(),
    cancelledAt: payment.cancelledAt?.toISOString() ?? null,
    cancelledBy: payment.cancelledBy,
    cancellationReason: payment.cancellationReason,
  };
}

export function toProviderPaymentDetailDto(
  payment: ProviderPayment,
  joined: ProviderPaymentJoinedFields,
  purchase: ProviderPaymentPurchaseFields
): ProviderPaymentDetailDto {
  return {
    ...toProviderPaymentDto(payment, joined),
    purchase: {
      id: purchase.id,
      folioCode: purchase.folioCode,
      folioNumber: purchase.folioNumber,
      total: purchase.total.toFixed(4),
      paidAmount: purchase.paidAmount.toFixed(4),
      paymentStatus: purchase.paymentStatus,
    },
  };
}
