export interface ProviderPaymentDto {
  id: string;
  purchaseId: string;
  purchaseFolioCode: string;
  providerId: string;
  providerName: string | null;
  branchId: string;
  branchName: string | null;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  creatorId: string;
  creatorName: string | null;
  amount: string;
  status: string;
  notes: string | null;
  paidAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
}

export interface ProviderPaymentDetailDto extends ProviderPaymentDto {
  purchase: {
    id: string;
    folioCode: string;
    folioNumber: number;
    total: string;
    paidAmount: string;
    paymentStatus: string;
  };
}

export interface RegisterProviderPaymentRequest {
  purchaseId: string;
  amount: number;
  notes?: string | null;
  creatorId: string;
}

export interface CancelProviderPaymentRequest {
  id: string;
  cancelledBy: string;
  cancellationReason: string | null;
}
