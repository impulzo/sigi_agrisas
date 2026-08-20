import { Purchase } from "../../domain/entities/Purchase";
import { PurchaseItem } from "../../domain/entities/PurchaseItem";
import { ProviderPayment } from "../../domain/entities/ProviderPayment";

export interface PurchaseJoinedFields {
  providerName: string | null;
  providerRfc: string | null;
  branchName: string | null;
  paymentMethodCode: string | null;
  paymentMethodIsCredit: boolean;
  creatorName: string | null;
}

export interface PurchaseSummary {
  purchase: Purchase;
  joined: PurchaseJoinedFields;
}

export interface PurchaseWithItems {
  purchase: Purchase;
  items: PurchaseItem[];
  providerPayments: ProviderPayment[];
  joined: PurchaseJoinedFields;
}

export interface FindAllPurchasesOptions {
  page: number;
  pageSize: number;
  branchId?: string;
  providerId?: string;
  statuses?: string[];
  from?: Date;
  to?: Date;
}

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
  discountPct: number | null;
  lotNumber?: string | null;
  expirationDate?: Date | null;
  manufactureDate?: Date | null;
}

export interface NewProviderInput {
  rfc: string;
  name: string;
  legalName?: string | null;
  taxRegime?: string | null;
}

export interface CreatePurchaseData {
  providerId?: string;
  newProvider?: NewProviderInput;
  branchId: string;
  paymentMethodId: string;
  creatorId: string;
  notes: string | null;
  items: CreatePurchaseItemInput[];
  purchasedAt?: Date;
  satUuid?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: Date | null;
  xmlFileName?: string | null;
}

export interface PurchaseRepository {
  findAll(opts: FindAllPurchasesOptions): Promise<{ items: PurchaseSummary[]; total: number }>;
  findByIdWithItems(id: string): Promise<PurchaseWithItems | null>;
  createCompleted(data: CreatePurchaseData): Promise<PurchaseWithItems>;
  cancel(
    id: string,
    cancelledBy: string,
    cancellationReason: string | null
  ): Promise<PurchaseWithItems>;
}
