import { randomUUID } from "crypto";
import {
  ProviderPaymentRepository,
  CreateProviderPaymentData,
  ProviderPaymentWithPurchase,
  ProviderPaymentJoinedFields,
} from "../../application/ports/ProviderPaymentRepository";
import { ProviderPayment } from "../../domain/entities/ProviderPayment";
import { PurchasePaymentStatus } from "../../domain/value-objects/PurchasePaymentStatus";
import { PurchasePaymentApplier } from "../../domain/services/PurchasePaymentApplier";
import { PurchaseNotFoundError } from "../../domain/errors/PurchaseNotFoundError";
import { PurchaseNotPayableError } from "../../domain/errors/PurchaseNotPayableError";
import { ProviderPaymentExceedsDueAmountError } from "../../domain/errors/ProviderPaymentExceedsDueAmountError";
import { ProviderPaymentNotFoundError } from "../../domain/errors/ProviderPaymentNotFoundError";
import { ProviderPaymentAlreadyCancelledError } from "../../domain/errors/ProviderPaymentAlreadyCancelledError";

interface PurchaseMock {
  id: string;
  folioCode: string;
  folioNumber: number;
  branchId: string;
  providerId: string;
  total: number;
  paidAmount: number;
  paymentStatus: PurchasePaymentStatus;
  isCredit: boolean;
}

interface ProviderMock {
  id: string;
  currentBalance: number;
}

export class InMemoryProviderPaymentRepository implements ProviderPaymentRepository {
  private providerPayments = new Map<string, ProviderPayment>();
  purchases = new Map<string, PurchaseMock>();
  providers = new Map<string, ProviderMock>();
  private folioCounter = 0;

  seedPurchase(purchase: PurchaseMock): void {
    this.purchases.set(purchase.id, { ...purchase });
  }

  seedProvider(provider: ProviderMock): void {
    this.providers.set(provider.id, { ...provider });
  }

  private joinedFor(purchase: PurchaseMock): ProviderPaymentJoinedFields {
    return {
      purchaseFolioCode: purchase.folioCode,
      providerName: null,
      branchName: null,
      creatorName: null,
    };
  }

  async createCompleted(data: CreateProviderPaymentData): Promise<ProviderPaymentWithPurchase> {
    const purchase = this.purchases.get(data.purchaseId);
    if (!purchase) throw new PurchaseNotFoundError();
    if (!purchase.isCredit) throw new PurchaseNotPayableError();

    const remaining = purchase.total - purchase.paidAmount;
    if (data.amount > remaining) throw new ProviderPaymentExceedsDueAmountError(remaining);

    const { newPaidAmount, newPaymentStatus } = PurchasePaymentApplier.applyPayment(
      { total: purchase.total, paidAmount: purchase.paidAmount },
      data.amount
    );
    purchase.paidAmount = newPaidAmount;
    purchase.paymentStatus = newPaymentStatus;

    const provider = this.providers.get(purchase.providerId);
    if (provider) provider.currentBalance -= data.amount;

    this.folioCounter++;
    const folioNumber = this.folioCounter;
    const folioCode = `PP-${String(folioNumber).padStart(6, "0")}`;

    const providerPayment = ProviderPayment.create(randomUUID(), {
      purchaseId: data.purchaseId,
      providerId: purchase.providerId,
      branchId: purchase.branchId,
      folioId: randomUUID(),
      folioNumber,
      folioCode,
      creatorId: data.creatorId,
      amount: data.amount,
      status: "completed",
      notes: data.notes,
      paidAt: new Date(),
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
    });
    this.providerPayments.set(providerPayment.id, providerPayment);

    return {
      providerPayment,
      purchase: {
        id: purchase.id,
        folioCode: purchase.folioCode,
        folioNumber: purchase.folioNumber,
        total: purchase.total,
        paidAmount: purchase.paidAmount,
        paymentStatus: purchase.paymentStatus,
        branchId: purchase.branchId,
        providerId: purchase.providerId,
      },
      joined: this.joinedFor(purchase),
    };
  }

  async markCancelled(
    id: string,
    cancelledBy: string,
    cancellationReason: string | null
  ): Promise<ProviderPaymentWithPurchase> {
    const providerPayment = this.providerPayments.get(id);
    if (!providerPayment) throw new ProviderPaymentNotFoundError();
    if (providerPayment.status === "cancelled") throw new ProviderPaymentAlreadyCancelledError();

    const purchase = this.purchases.get(providerPayment.purchaseId)!;
    const { newPaidAmount, newPaymentStatus } = PurchasePaymentApplier.cancelPayment(
      { total: purchase.total, paidAmount: purchase.paidAmount },
      providerPayment.amount
    );
    purchase.paidAmount = newPaidAmount;
    purchase.paymentStatus = newPaymentStatus;

    const provider = this.providers.get(purchase.providerId);
    if (provider) provider.currentBalance += providerPayment.amount;

    const cancelled = ProviderPayment.create(providerPayment.id, {
      purchaseId: providerPayment.purchaseId,
      providerId: providerPayment.providerId,
      branchId: providerPayment.branchId,
      folioId: providerPayment.folioId,
      folioNumber: providerPayment.folioNumber,
      folioCode: providerPayment.folioCode,
      creatorId: providerPayment.creatorId,
      amount: providerPayment.amount,
      status: "cancelled",
      notes: providerPayment.notes,
      paidAt: providerPayment.paidAt,
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason,
    });
    this.providerPayments.set(id, cancelled);

    return {
      providerPayment: cancelled,
      purchase: {
        id: purchase.id,
        folioCode: purchase.folioCode,
        folioNumber: purchase.folioNumber,
        total: purchase.total,
        paidAmount: purchase.paidAmount,
        paymentStatus: purchase.paymentStatus,
        branchId: purchase.branchId,
        providerId: purchase.providerId,
      },
      joined: this.joinedFor(purchase),
    };
  }

  async findById(id: string): Promise<ProviderPaymentWithPurchase | null> {
    const providerPayment = this.providerPayments.get(id);
    if (!providerPayment) return null;
    const purchase = this.purchases.get(providerPayment.purchaseId);
    if (!purchase) return null;
    return {
      providerPayment,
      purchase: {
        id: purchase.id,
        folioCode: purchase.folioCode,
        folioNumber: purchase.folioNumber,
        total: purchase.total,
        paidAmount: purchase.paidAmount,
        paymentStatus: purchase.paymentStatus,
        branchId: purchase.branchId,
        providerId: purchase.providerId,
      },
      joined: this.joinedFor(purchase),
    };
  }

  async listByPurchase(purchaseId: string): Promise<ProviderPaymentWithPurchase[]> {
    const purchase = this.purchases.get(purchaseId);
    if (!purchase) return [];
    const rows = Array.from(this.providerPayments.values())
      .filter((p) => p.purchaseId === purchaseId)
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
    return rows.map((providerPayment) => ({
      providerPayment,
      purchase: {
        id: purchase.id,
        folioCode: purchase.folioCode,
        folioNumber: purchase.folioNumber,
        total: purchase.total,
        paidAmount: purchase.paidAmount,
        paymentStatus: purchase.paymentStatus,
        branchId: purchase.branchId,
        providerId: purchase.providerId,
      },
      joined: this.joinedFor(purchase),
    }));
  }
}
