import { Prisma, PrismaClient } from "@prisma/client";
import {
  ProviderPaymentReportRepository,
  ProviderPaymentsReportFilters,
  ProviderPaymentsReportRow,
} from "../../application/ports/ProviderPaymentReportRepository";

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Repositorio de solo lectura para el reporte de pagos a proveedores. No reutiliza
 * `ProviderPaymentRepository` (port transaccional de `purchases`, sin listado global) —
 * ver design.md D2.
 */
export class PrismaProviderPaymentReportRepository implements ProviderPaymentReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(
    filters: ProviderPaymentsReportFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<{ items: ProviderPaymentsReportRow[]; total: number }> {
    const where: Prisma.ProviderPaymentWhereInput = {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.providerId ? { providerId: filters.providerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            paidAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.providerPayment.findMany({
        where,
        include: {
          purchase: { select: { folioCode: true } },
          provider: { select: { name: true, initialBalance: true, currentBalance: true } },
          branch: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.providerPayment.count({ where }),
    ]);

    const items: ProviderPaymentsReportRow[] = rows.map((r) => ({
      id: r.id,
      folioCode: r.folioCode,
      purchaseFolioCode: r.purchase.folioCode,
      providerName: r.provider?.name ?? null,
      branchName: r.branch?.name ?? null,
      amount: Number(r.amount),
      status: r.status,
      paidAt: r.paidAt,
      providerInitialBalance: r.provider ? Number(r.provider.initialBalance) : null,
      providerCurrentBalance: r.provider ? Number(r.provider.currentBalance) : null,
    }));

    return { items, total };
  }
}
