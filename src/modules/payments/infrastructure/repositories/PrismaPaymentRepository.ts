import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  PaymentRepository,
  CreatePaymentInput,
  ListPaymentsFilters,
  ListPaymentsPagination,
  PaymentWithSale,
  PaymentListRow,
  SaleTotals,
  HistoryFilters,
  HistoryResult,
  PaymentHistoryItem,
} from "../../application/ports/PaymentRepository";
import { CustomerPayment } from "../../domain/entities/CustomerPayment";
import { PaymentStatus } from "../../domain/value-objects/PaymentStatus";
import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";
import { PaymentNotFoundError } from "../../domain/errors/PaymentNotFoundError";
import { PaymentAlreadyCancelledError } from "../../domain/errors/PaymentAlreadyCancelledError";
import { PaymentExceedsDueAmountError } from "../../domain/errors/PaymentExceedsDueAmountError";
import { SaleNotPayableError } from "../../domain/errors/SaleNotPayableError";
import { BranchScopeViolationError } from "../../domain/errors/BranchScopeViolationError";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";
import { allocateFolio } from "@/shared/infrastructure/folios/allocateFolio";
import { FolioScopeMismatchError } from "@/shared/domain/errors/FolioScopeMismatchError";
import { FolioScope } from "@/shared/domain/types/FolioScope";

type TxClient = Prisma.TransactionClient;

function computePaymentStatus(paidAmount: number, total: number): SalePaymentStatus {
  if (paidAmount >= total) return "paid";
  if (paidAmount > 0) return "partial";
  return "pending";
}

function toPayment(row: {
  id: string;
  saleId: string;
  customerId: string;
  userId: string;
  branchId: string;
  paymentMethodId: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  amount: Prisma.Decimal;
  status: string;
  notes: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}): CustomerPayment {
  return CustomerPayment.create(row.id, {
    saleId: row.saleId,
    customerId: row.customerId,
    userId: row.userId,
    branchId: row.branchId,
    paymentMethodId: row.paymentMethodId,
    folioId: row.folioId,
    folioNumber: row.folioNumber,
    folioCode: row.folioCode,
    amount: Number(row.amount),
    status: row.status as PaymentStatus,
    notes: row.notes,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
  });
}

const includePaymentJoins = {
  sale: { select: { folioCode: true, folioNumber: true, total: true, paidAmount: true, paymentStatus: true, branchId: true, customerId: true } },
  customer: { select: { name: true } },
  user: { select: { name: true, email: true } },
  branch: { select: { name: true } },
  paymentMethod: { select: { code: true } },
} as const;

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCompleted(input: CreatePaymentInput): Promise<PaymentWithSale> {
    const paymentId = randomUUID();

    return await this.prisma.$transaction(async (tx) => {
      // Load sale with paymentMethod to verify credit status
      const saleRow = await tx.sale.findUnique({
        where: { id: input.saleId },
        include: { paymentMethod: { select: { isCredit: true } } },
      });
      if (!saleRow) throw new Error("Sale not found");
      if (saleRow.status !== "completed") throw new SaleNotPayableError({ status: saleRow.status });
      if (!saleRow.paymentMethod.isCredit) throw new SaleNotPayableError({ reason: "not_credit" });

      // Branch scope: validate before any mutation
      if (input.callerBranchId !== null && saleRow.branchId !== input.callerBranchId) {
        throw new BranchScopeViolationError();
      }

      // Validate folio is active + scope is OPERATIONS
      const folioRow = await tx.folio.findUnique({ where: { id: input.folioId } });
      if (!folioRow || !folioRow.isActive) throw new InactiveResourceError("Folio");
      if (folioRow.scope !== "OPERATIONS")
        throw new FolioScopeMismatchError("OPERATIONS", folioRow.scope as FolioScope);

      // Validate paymentMethod is active
      const pmRow = await tx.paymentMethod.findUnique({ where: { id: input.paymentMethodId } });
      if (!pmRow || !pmRow.isActive) throw new InactiveResourceError("PaymentMethod");

      const saleTotal = Number(saleRow.total);
      const salePaidAmount = Number(saleRow.paidAmount);
      const remaining = saleTotal - salePaidAmount;

      if (input.amount > remaining) throw new PaymentExceedsDueAmountError(remaining);

      // Allocate folio
      const { folioNumber, folioCode } = await allocateFolio(tx, input.folioId);

      // Calculate new payment status
      const newPaidAmount = salePaidAmount + input.amount;
      const newPaymentStatus = computePaymentStatus(newPaidAmount, saleTotal);

      // Update sale paid_amount and payment_status atomically
      await tx.$executeRaw`
        UPDATE sales
        SET paid_amount = paid_amount + ${input.amount}::numeric,
            payment_status = ${newPaymentStatus},
            updated_at = NOW()
        WHERE id = ${input.saleId}
      `;

      // Update customer current_balance (decrement)
      await tx.$executeRaw`
        UPDATE customers
        SET current_balance = current_balance - ${input.amount}::numeric,
            updated_at = NOW()
        WHERE id = ${saleRow.customerId!}
      `;

      // Insert payment and fetch with joins in one shot
      await tx.customerPayment.create({
        data: {
          id: paymentId,
          saleId: input.saleId,
          customerId: saleRow.customerId!,
          userId: input.userId,
          branchId: saleRow.branchId,
          paymentMethodId: input.paymentMethodId,
          folioId: input.folioId,
          folioNumber,
          folioCode,
          amount: new Prisma.Decimal(input.amount),
          status: "completed",
          notes: input.notes,
        },
      });

      const paymentRow = await tx.customerPayment.findUnique({
        where: { id: paymentId },
        include: includePaymentJoins,
      });

      return {
        payment: toPayment(paymentRow!),
        sale: {
          id: saleRow.id,
          folioCode: saleRow.folioCode,
          folioNumber: saleRow.folioNumber,
          total: saleTotal,
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          branchId: saleRow.branchId,
          customerId: saleRow.customerId,
        },
        joins: {
          saleFolioCode: saleRow.folioCode,
          customerName: paymentRow!.customer?.name ?? "",
          userName: paymentRow!.user
            ? (paymentRow!.user.name || paymentRow!.user.email)
            : "",
          branchName: paymentRow!.branch?.name ?? "",
          paymentMethodCode: pmRow.code,
        },
      };
    });
  }

  async markCancelled(id: string, reason: string | null, _userId: string): Promise<PaymentWithSale> {
    return await this.prisma.$transaction(async (tx) => {
      // Update status atomically — fail if already cancelled
      const updated = await tx.$executeRaw`
        UPDATE customer_payments
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = ${reason}
        WHERE id = ${id} AND status = 'completed'
      `;
      if (updated === 0) {
        const exists = await tx.customerPayment.findUnique({ where: { id } });
        if (!exists) throw new PaymentNotFoundError(id);
        throw new PaymentAlreadyCancelledError();
      }

      // Fetch with joins for the response
      const paymentRow = await tx.customerPayment.findUnique({
        where: { id },
        include: includePaymentJoins,
      });
      const amount = Number(paymentRow!.amount);
      const saleId = paymentRow!.saleId;

      // Load sale to recalculate
      const saleRow = await tx.sale.findUnique({ where: { id: saleId } });
      const saleTotal = Number(saleRow!.total);
      const currentPaid = Number(saleRow!.paidAmount);
      const newPaidAmount = Math.max(0, currentPaid - amount);
      const newPaymentStatus = computePaymentStatus(newPaidAmount, saleTotal);

      // Update sale
      await tx.$executeRaw`
        UPDATE sales
        SET paid_amount = paid_amount - ${amount}::numeric,
            payment_status = ${newPaymentStatus},
            updated_at = NOW()
        WHERE id = ${saleId}
      `;

      // Restore customer balance
      await tx.$executeRaw`
        UPDATE customers
        SET current_balance = current_balance + ${amount}::numeric,
            updated_at = NOW()
        WHERE id = ${saleRow!.customerId!}
      `;

      return {
        payment: toPayment(paymentRow!),
        sale: {
          id: saleRow!.id,
          folioCode: saleRow!.folioCode,
          folioNumber: saleRow!.folioNumber,
          total: saleTotal,
          paidAmount: newPaidAmount,
          paymentStatus: newPaymentStatus,
          branchId: saleRow!.branchId,
          customerId: saleRow!.customerId,
        },
        joins: {
          saleFolioCode: saleRow!.folioCode,
          customerName: paymentRow!.customer?.name ?? "",
          userName: paymentRow!.user
            ? (paymentRow!.user.name || paymentRow!.user.email)
            : "",
          branchName: paymentRow!.branch?.name ?? "",
          paymentMethodCode: paymentRow!.paymentMethod?.code ?? "",
        },
      };
    });
  }

  async findById(id: string): Promise<PaymentWithSale | null> {
    const row = await this.prisma.customerPayment.findUnique({
      where: { id },
      include: includePaymentJoins,
    });
    if (!row) return null;

    const sale = row.sale!;
    return {
      payment: toPayment(row),
      sale: {
        id: row.saleId,
        folioCode: sale.folioCode,
        folioNumber: sale.folioNumber,
        total: Number(sale.total),
        paidAmount: Number(sale.paidAmount),
        paymentStatus: sale.paymentStatus as SalePaymentStatus,
        branchId: sale.branchId,
        customerId: sale.customerId,
      },
      joins: {
        saleFolioCode: sale.folioCode,
        customerName: row.customer?.name ?? "",
        userName: row.user ? (row.user.name || row.user.email) : "",
        branchName: row.branch?.name ?? "",
        paymentMethodCode: row.paymentMethod?.code ?? "",
      },
    };
  }

  async list(
    filters: ListPaymentsFilters,
    pagination: ListPaymentsPagination
  ): Promise<{ items: PaymentListRow[]; total: number }> {
    const where: Prisma.CustomerPaymentWhereInput = {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.saleId ? { saleId: filters.saleId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.paymentMethodId ? { paymentMethodId: filters.paymentMethodId } : {}),
      ...(filters.statuses && filters.statuses.length > 0 ? { status: { in: filters.statuses } } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const skip = (pagination.page - 1) * pagination.pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.customerPayment.findMany({
        where,
        skip,
        take: pagination.pageSize,
        orderBy: { createdAt: "desc" },
        include: includePaymentJoins,
      }),
      this.prisma.customerPayment.count({ where }),
    ]);

    const items: PaymentListRow[] = rows.map((row) => ({
      payment: toPayment(row),
      joins: {
        saleFolioCode: row.sale?.folioCode ?? "",
        customerName: row.customer?.name ?? "",
        userName: row.user ? (row.user.name || row.user.email) : "",
        branchName: row.branch?.name ?? "",
        paymentMethodCode: row.paymentMethod?.code ?? "",
      },
    }));

    return { items, total };
  }

  async listBySale(saleId: string): Promise<{ items: PaymentListRow[]; saleTotals: SaleTotals }> {
    const [rows, saleRow] = await Promise.all([
      this.prisma.customerPayment.findMany({
        where: { saleId },
        orderBy: { createdAt: "asc" },
        include: includePaymentJoins,
      }),
      this.prisma.sale.findUnique({ where: { id: saleId } }),
    ]);

    if (!saleRow) throw new Error("Sale not found");

    const saleTotal = Number(saleRow.total);
    const salePaidAmount = Number(saleRow.paidAmount);

    const items: PaymentListRow[] = rows.map((row) => ({
      payment: toPayment(row),
      joins: {
        saleFolioCode: saleRow.folioCode,
        customerName: row.customer?.name ?? "",
        userName: row.user ? (row.user.name || row.user.email) : "",
        branchName: row.branch?.name ?? "",
        paymentMethodCode: row.paymentMethod?.code ?? "",
      },
    }));

    return {
      items,
      saleTotals: {
        saleId,
        saleBranchId: saleRow.branchId,
        saleTotal,
        salePaidAmount,
        salePaymentStatus: saleRow.paymentStatus as SalePaymentStatus,
      },
    };
  }

  async findHistory(
    filters: HistoryFilters,
    pagination?: ListPaymentsPagination
  ): Promise<HistoryResult> {
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.branchId) {
      conditions.push(`cp.branch_id = $${paramIdx++}`);
      params.push(filters.branchId);
    }
    if (filters.saleId) {
      conditions.push(`cp.sale_id = $${paramIdx++}`);
      params.push(filters.saleId);
    }
    if (filters.customerId) {
      conditions.push(`cp.customer_id = $${paramIdx++}`);
      params.push(filters.customerId);
    }
    if (filters.userId) {
      conditions.push(`cp.user_id = $${paramIdx++}::uuid`);
      params.push(filters.userId);
    }
    if (filters.paymentMethodId) {
      conditions.push(`cp.payment_method_id = $${paramIdx++}`);
      params.push(filters.paymentMethodId);
    }
    if (filters.statuses && filters.statuses.length > 0) {
      conditions.push(`cp.status = ANY($${paramIdx++}::text[])`);
      params.push(filters.statuses);
    }
    if (filters.from) {
      conditions.push(`cp.created_at >= $${paramIdx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`cp.created_at <= $${paramIdx++}`);
      params.push(filters.to);
    }
    if (filters.productId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = cp.sale_id AND si.product_id = $${paramIdx++})`
      );
      params.push(filters.productId);
    }

    const whereClause = conditions.join(" AND ");

    type AggRow = { total_count: string; completed_count: string; cancelled_count: string; total_completed: string; total_cancelled: string };
    const aggRows = await this.prisma.$queryRawUnsafe<AggRow[]>(
      `SELECT
        COUNT(*)::text AS total_count,
        SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END)::text AS completed_count,
        SUM(CASE WHEN cp.status = 'cancelled' THEN 1 ELSE 0 END)::text AS cancelled_count,
        COALESCE(SUM(CASE WHEN cp.status = 'completed' THEN cp.amount ELSE 0 END), 0)::text AS total_completed,
        COALESCE(SUM(CASE WHEN cp.status = 'cancelled' THEN cp.amount ELSE 0 END), 0)::text AS total_cancelled
       FROM customer_payments cp
       WHERE ${whereClause}`,
      ...params
    );

    const agg = aggRows[0];
    const total = parseInt(agg.total_count || "0", 10);
    const completedCount = parseInt(agg.completed_count || "0", 10);
    const cancelledCount = parseInt(agg.cancelled_count || "0", 10);
    const totalAmountCompleted = parseFloat(agg.total_completed || "0").toFixed(4);
    const totalAmountCancelled = parseFloat(agg.total_cancelled || "0").toFixed(4);

    let limitClause = "";
    let offsetClause = "";
    if (pagination) {
      limitClause = `LIMIT $${paramIdx++}`;
      params.push(pagination.pageSize);
      offsetClause = `OFFSET $${paramIdx++}`;
      params.push((pagination.page - 1) * pagination.pageSize);
    }

    type ItemRow = {
      id: string;
      created_at: Date;
      folio_code: string;
      sale_id: string;
      sale_folio_code: string;
      customer_id: string;
      customer_name: string;
      user_id: string;
      user_name: string;
      branch_id: string;
      branch_name: string;
      payment_method_code: string;
      amount: string;
      status: string;
      cancelled_at: Date | null;
    };

    const itemRows = await this.prisma.$queryRawUnsafe<ItemRow[]>(
      `SELECT
        cp.id,
        cp.created_at,
        cp.folio_code,
        cp.sale_id,
        s.folio_code AS sale_folio_code,
        cp.customer_id,
        c.name AS customer_name,
        cp.user_id::text,
        COALESCE(u.name, u.email) AS user_name,
        cp.branch_id,
        b.name AS branch_name,
        pm.code AS payment_method_code,
        cp.amount::text,
        cp.status,
        cp.cancelled_at
       FROM customer_payments cp
       JOIN sales s ON s.id = cp.sale_id
       JOIN customers c ON c.id = cp.customer_id
       JOIN users u ON u.id = cp.user_id
       JOIN branches b ON b.id = cp.branch_id
       JOIN payment_methods pm ON pm.id = cp.payment_method_id
       WHERE ${whereClause}
       ORDER BY cp.created_at DESC
       ${limitClause}
       ${offsetClause}`,
      ...params
    );

    const items: PaymentHistoryItem[] = itemRows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      folioCode: row.folio_code,
      saleId: row.sale_id,
      saleFolioCode: row.sale_folio_code,
      customerId: row.customer_id,
      customerName: row.customer_name,
      userId: row.user_id,
      userName: row.user_name,
      branchId: row.branch_id,
      branchName: row.branch_name,
      paymentMethodCode: row.payment_method_code,
      amount: parseFloat(row.amount),
      status: row.status,
      cancelledAt: row.cancelled_at,
    }));

    return { items, total, totalAmountCompleted, totalAmountCancelled, completedCount, cancelledCount };
  }
}
