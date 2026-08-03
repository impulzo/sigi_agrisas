import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  ProviderPaymentRepository,
  CreateProviderPaymentData,
  ProviderPaymentWithPurchase,
  ProviderPaymentJoinedFields,
  ProviderPaymentPurchaseFields,
} from "../../application/ports/ProviderPaymentRepository";
import { ProviderPayment } from "../../domain/entities/ProviderPayment";
import { ProviderPaymentStatus } from "../../domain/value-objects/ProviderPaymentStatus";
import { PurchasePaymentStatus } from "../../domain/value-objects/PurchasePaymentStatus";
import { PurchasePaymentApplier } from "../../domain/services/PurchasePaymentApplier";
import { PurchaseNotFoundError } from "../../domain/errors/PurchaseNotFoundError";
import { PurchaseNotPayableError } from "../../domain/errors/PurchaseNotPayableError";
import { ProviderPaymentExceedsDueAmountError } from "../../domain/errors/ProviderPaymentExceedsDueAmountError";
import { ProviderPaymentNotFoundError } from "../../domain/errors/ProviderPaymentNotFoundError";
import { ProviderPaymentAlreadyCancelledError } from "../../domain/errors/ProviderPaymentAlreadyCancelledError";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";
import { allocateFolio } from "@/shared/infrastructure/folios/allocateFolio";

const PP_FOLIO_CODE = "PP";
const FOLIO_SCOPE = "OPERATIONS";

const includeJoins = {
  purchase: { select: { folioCode: true, folioNumber: true, total: true, paidAmount: true, paymentStatus: true, branchId: true, providerId: true } },
  provider: { select: { name: true } },
  branch: { select: { name: true } },
  creator: { select: { name: true, email: true } },
} as const;

type PrismaProviderPaymentWithJoins = Prisma.ProviderPaymentGetPayload<{ include: typeof includeJoins }>;

function toDomain(row: PrismaProviderPaymentWithJoins): ProviderPayment {
  return ProviderPayment.create(row.id, {
    purchaseId: row.purchaseId,
    providerId: row.providerId,
    branchId: row.branchId,
    folioId: row.folioId,
    folioNumber: row.folioNumber,
    folioCode: row.folioCode,
    creatorId: row.creatorId,
    amount: Number(row.amount),
    status: row.status as ProviderPaymentStatus,
    notes: row.notes,
    paidAt: row.paidAt,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
  });
}

function toJoined(row: PrismaProviderPaymentWithJoins): ProviderPaymentJoinedFields {
  return {
    purchaseFolioCode: row.purchase.folioCode,
    providerName: row.provider?.name ?? null,
    branchName: row.branch?.name ?? null,
    creatorName: row.creator ? row.creator.name || row.creator.email : null,
  };
}

function toWithPurchase(
  row: PrismaProviderPaymentWithJoins,
  purchaseOverride?: Partial<ProviderPaymentPurchaseFields>
): ProviderPaymentWithPurchase {
  const purchase: ProviderPaymentPurchaseFields = {
    id: row.purchaseId,
    folioCode: row.purchase.folioCode,
    folioNumber: row.purchase.folioNumber,
    total: Number(row.purchase.total),
    paidAmount: Number(row.purchase.paidAmount),
    paymentStatus: row.purchase.paymentStatus as PurchasePaymentStatus,
    branchId: row.purchase.branchId,
    providerId: row.purchase.providerId,
    ...purchaseOverride,
  };
  return { providerPayment: toDomain(row), purchase, joined: toJoined(row) };
}

export class PrismaProviderPaymentRepository implements ProviderPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCompleted(data: CreateProviderPaymentData): Promise<ProviderPaymentWithPurchase> {
    const providerPaymentId = randomUUID();

    return await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: data.purchaseId },
        include: { paymentMethod: { select: { isCredit: true } } },
      });
      if (!purchase) throw new PurchaseNotFoundError();
      if (!purchase.paymentMethod.isCredit) throw new PurchaseNotPayableError();

      const purchaseTotal = Number(purchase.total);
      const purchasePaidAmount = Number(purchase.paidAmount);
      const remaining = purchaseTotal - purchasePaidAmount;
      if (data.amount > remaining) throw new ProviderPaymentExceedsDueAmountError(remaining);

      const folio = await tx.folio.findFirst({ where: { code: PP_FOLIO_CODE, scope: FOLIO_SCOPE, isActive: true } });
      if (!folio) throw new InactiveResourceError(`Folio ${PP_FOLIO_CODE}`);
      const { folioNumber, folioCode } = await allocateFolio(tx, folio.id);

      const { newPaidAmount, newPaymentStatus } = PurchasePaymentApplier.applyPayment(
        { total: purchaseTotal, paidAmount: purchasePaidAmount },
        data.amount
      );

      await tx.$executeRaw`
        UPDATE purchases
        SET paid_amount = paid_amount + ${data.amount}::numeric,
            payment_status = ${newPaymentStatus},
            updated_at = NOW()
        WHERE id = ${data.purchaseId}
      `;

      await tx.$executeRaw`
        UPDATE providers
        SET current_balance = current_balance - ${data.amount}::numeric,
            updated_at = NOW()
        WHERE id = ${purchase.providerId}
      `;

      await tx.providerPayment.create({
        data: {
          id: providerPaymentId,
          purchaseId: data.purchaseId,
          providerId: purchase.providerId,
          branchId: purchase.branchId,
          folioId: folio.id,
          folioNumber,
          folioCode,
          creatorId: data.creatorId,
          amount: new Prisma.Decimal(data.amount),
          status: "completed",
          notes: data.notes,
        },
      });

      const row = await tx.providerPayment.findUnique({ where: { id: providerPaymentId }, include: includeJoins });
      return toWithPurchase(row as PrismaProviderPaymentWithJoins, {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
      });
    });
  }

  async markCancelled(
    id: string,
    cancelledBy: string,
    cancellationReason: string | null
  ): Promise<ProviderPaymentWithPurchase> {
    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE provider_payments
        SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ${cancelledBy}::uuid, cancellation_reason = ${cancellationReason}
        WHERE id = ${id} AND status = 'completed'
      `;
      if (updated === 0) {
        const exists = await tx.providerPayment.findUnique({ where: { id } });
        if (!exists) throw new ProviderPaymentNotFoundError();
        throw new ProviderPaymentAlreadyCancelledError();
      }

      const row = await tx.providerPayment.findUnique({ where: { id }, include: includeJoins });
      const amount = Number(row!.amount);
      const purchaseId = row!.purchaseId;

      const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
      const purchaseTotal = Number(purchase!.total);
      const currentPaid = Number(purchase!.paidAmount);
      const { newPaidAmount, newPaymentStatus } = PurchasePaymentApplier.cancelPayment(
        { total: purchaseTotal, paidAmount: currentPaid },
        amount
      );

      await tx.$executeRaw`
        UPDATE purchases
        SET paid_amount = paid_amount - ${amount}::numeric,
            payment_status = ${newPaymentStatus},
            updated_at = NOW()
        WHERE id = ${purchaseId}
      `;

      await tx.$executeRaw`
        UPDATE providers
        SET current_balance = current_balance + ${amount}::numeric,
            updated_at = NOW()
        WHERE id = ${purchase!.providerId}
      `;

      return toWithPurchase(row as PrismaProviderPaymentWithJoins, {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
      });
    });
  }

  async findById(id: string): Promise<ProviderPaymentWithPurchase | null> {
    const row = await this.prisma.providerPayment.findUnique({ where: { id }, include: includeJoins });
    if (!row) return null;
    return toWithPurchase(row as PrismaProviderPaymentWithJoins);
  }

  async listByPurchase(purchaseId: string): Promise<ProviderPaymentWithPurchase[]> {
    const rows = await this.prisma.providerPayment.findMany({
      where: { purchaseId },
      include: includeJoins,
      orderBy: { paidAt: "desc" },
    });
    return rows.map((row) => toWithPurchase(row as PrismaProviderPaymentWithJoins));
  }
}
