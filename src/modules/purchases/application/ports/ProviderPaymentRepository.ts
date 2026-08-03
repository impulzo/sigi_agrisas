import { ProviderPayment } from "../../domain/entities/ProviderPayment";
import { PurchasePaymentStatus } from "../../domain/value-objects/PurchasePaymentStatus";

export interface ProviderPaymentJoinedFields {
  purchaseFolioCode: string;
  providerName: string | null;
  branchName: string | null;
  creatorName: string | null;
}

export interface ProviderPaymentPurchaseFields {
  id: string;
  folioCode: string;
  folioNumber: number;
  total: number;
  paidAmount: number;
  paymentStatus: PurchasePaymentStatus;
  branchId: string;
  providerId: string;
}

export interface ProviderPaymentWithPurchase {
  providerPayment: ProviderPayment;
  purchase: ProviderPaymentPurchaseFields;
  joined: ProviderPaymentJoinedFields;
}

export interface CreateProviderPaymentData {
  purchaseId: string;
  creatorId: string;
  amount: number;
  notes: string | null;
}

export interface ProviderPaymentRepository {
  createCompleted(data: CreateProviderPaymentData): Promise<ProviderPaymentWithPurchase>;
  markCancelled(
    id: string,
    cancelledBy: string,
    cancellationReason: string | null
  ): Promise<ProviderPaymentWithPurchase>;
  findById(id: string): Promise<ProviderPaymentWithPurchase | null>;
  listByPurchase(purchaseId: string): Promise<ProviderPaymentWithPurchase[]>;
}
