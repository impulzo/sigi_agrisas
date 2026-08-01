import { Prisma, PrismaClient } from "@prisma/client";
import {
  AccountStatementRepository,
  AccountSummaryResult,
  AccountLedgerData,
  AnticipoReceiptData,
} from "../../application/ports/AccountStatementRepository";
import {
  AccountStatementSummaryFilters,
  AccountStatementLedgerFilters,
} from "../../domain/value-objects/AccountStatementFilters";
import { RawAccountMovement } from "../../domain/value-objects/AccountMovement";

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function dateRangeWhere(from: Date | null, to: Date | null) {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: endOfDay(to) } : {}),
    },
  };
}

export class PrismaAccountStatementRepository implements AccountStatementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async summary(
    filters: AccountStatementSummaryFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<AccountSummaryResult> {
    const customerWhere: Prisma.CustomerWhereInput = {
      ...(filters.onlyWithBalance ? { currentBalance: { not: 0 } } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { code: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.customer.count({ where: customerWhere });

    const customers = await this.prisma.customer.findMany({
      where: customerWhere,
      select: { id: true, code: true, name: true, currentBalance: true, creditLimit: true },
      orderBy: { name: "asc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    const customerIds = customers.map((c) => c.id);
    const dateWhere = dateRangeWhere(filters.from, filters.to);
    const branchWhere = filters.branchId ? { branchId: filters.branchId } : {};

    const chargedByCustomer = new Map<string, number>();
    const paidByCustomer = new Map<string, number>();

    if (customerIds.length > 0) {
      const [chargedRows, paidRows] = await Promise.all([
        this.prisma.sale.groupBy({
          by: ["customerId"],
          where: {
            customerId: { in: customerIds },
            status: { not: "cancelled" },
            paymentMethod: { isCredit: true },
            ...branchWhere,
            ...dateWhere,
          },
          _sum: { total: true },
        }),
        this.prisma.customerPayment.groupBy({
          by: ["customerId"],
          where: {
            customerId: { in: customerIds },
            status: "completed",
            ...branchWhere,
            ...dateWhere,
          },
          _sum: { amount: true },
        }),
      ]);

      for (const r of chargedRows) {
        if (r.customerId) chargedByCustomer.set(r.customerId, Number(r._sum.total ?? 0));
      }
      for (const r of paidRows) {
        paidByCustomer.set(r.customerId, Number(r._sum.amount ?? 0));
      }
    }

    return {
      items: customers.map((c) => ({
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
        totalCharged: chargedByCustomer.get(c.id) ?? 0,
        totalPaid: paidByCustomer.get(c.id) ?? 0,
        currentBalance: Number(c.currentBalance),
        creditLimit: c.creditLimit === null ? null : Number(c.creditLimit),
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async ledger(
    customerId: string,
    filters: AccountStatementLedgerFilters
  ): Promise<AccountLedgerData | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        code: true,
        name: true,
        currentBalance: true,
        creditLimit: true,
        address: true,
      },
    });
    if (!customer) return null;

    const branchWhere = filters.branchId ? { branchId: filters.branchId } : {};

    const [sales, payments, lastSale] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId, ...branchWhere },
        select: {
          id: true,
          total: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          dueDate: true,
          folioCode: true,
          folioNumber: true,
          branchId: true,
          paymentMethod: { select: { isCredit: true, code: true } },
        },
      }),
      this.prisma.customerPayment.findMany({
        where: { customerId, ...branchWhere },
        select: {
          id: true,
          saleId: true,
          amount: true,
          status: true,
          notes: true,
          createdAt: true,
          folioCode: true,
          folioNumber: true,
          branchId: true,
          paymentMethod: { select: { code: true } },
        },
      }),
      // Última factura emitida (sin filtro de rango; branch-scoped).
      this.prisma.sale.findFirst({
        where: { customerId, ...branchWhere },
        orderBy: [{ createdAt: "desc" }, { folioNumber: "desc" }],
        select: { folioCode: true, folioNumber: true },
      }),
    ]);

    const movements: RawAccountMovement[] = [
      ...sales.map((s) => ({
        id: s.id,
        kind: "sale" as const,
        isCredit: s.paymentMethod.isCredit,
        status: s.status,
        amount: Number(s.total),
        date: s.createdAt,
        folioCode: s.folioCode,
        folioNumber: s.folioNumber,
        branchId: s.branchId,
        dueDate: s.dueDate,
        reference: null,
        paymentMethodCode: s.paymentMethod.code,
        paymentStatus: s.paymentStatus,
        saleId: null,
      })),
      ...payments.map((p) => ({
        id: p.id,
        kind: "payment" as const,
        isCredit: false,
        status: p.status,
        amount: Number(p.amount),
        date: p.createdAt,
        folioCode: p.folioCode,
        folioNumber: p.folioNumber,
        branchId: p.branchId,
        dueDate: null,
        reference: p.notes,
        paymentMethodCode: p.paymentMethod.code,
        paymentStatus: null,
        saleId: p.saleId,
      })),
    ];

    return {
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        currentBalance: Number(customer.currentBalance),
        creditLimit: customer.creditLimit === null ? null : Number(customer.creditLimit),
        address: customer.address,
      },
      lastInvoice: lastSale
        ? { serie: lastSale.folioCode, folioNumber: lastSale.folioNumber }
        : null,
      movements,
    };
  }

  async anticipoReceipt(
    customerId: string,
    paymentId: string,
    branchId: string | null
  ): Promise<AnticipoReceiptData | null> {
    const payment = await this.prisma.customerPayment.findFirst({
      where: {
        id: paymentId,
        customerId,
        ...(branchId ? { branchId } : {}),
      },
      select: {
        id: true,
        folioCode: true,
        folioNumber: true,
        amount: true,
        status: true,
        notes: true,
        createdAt: true,
        paymentMethod: { select: { code: true, name: true } },
        customer: { select: { code: true, name: true, address: true } },
        sale: { select: { folioCode: true, folioNumber: true } },
      },
    });
    if (!payment) return null;

    return {
      payment: {
        id: payment.id,
        folioCode: payment.folioCode,
        folioNumber: payment.folioNumber,
        amount: Number(payment.amount),
        status: payment.status,
        createdAt: payment.createdAt,
        reference: payment.notes,
        paymentMethodCode: payment.paymentMethod.code,
        paymentMethodName: payment.paymentMethod.name,
      },
      customer: {
        code: payment.customer.code,
        name: payment.customer.name,
        address: payment.customer.address,
      },
      sale: {
        folioCode: payment.sale.folioCode,
        folioNumber: payment.sale.folioNumber,
      },
    };
  }
}
