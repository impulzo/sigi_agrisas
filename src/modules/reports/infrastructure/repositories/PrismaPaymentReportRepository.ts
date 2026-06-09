import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PaymentReportRepository, RawPaymentRow } from "../../application/ports/PaymentReportRepository";
import { PaymentReportFilters } from "../../domain/value-objects/PaymentReportFilters";

export class PrismaPaymentReportRepository implements PaymentReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPayments(filters: PaymentReportFilters): Promise<RawPaymentRow[]> {
    const rows = await this.prisma.customerPayment.findMany({
      where: {
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lte: endOfDay(filters.endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        sale: true,
        customer: true,
        branch: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      paymentId: row.id,
      folioNumber: `${row.folioCode}-${row.folioNumber}`,
      saleId: row.saleId,
      saleFolioNumber: `${row.sale.folioCode}-${row.sale.folioNumber}`,
      customerId: row.customerId,
      customerCode: row.customer.code,
      customerName: row.customer.name,
      branchId: row.branchId,
      branchCode: row.branch.code,
      amount: row.amount as unknown as Decimal,
      paymentDate: row.createdAt,
      status: row.status,
      registeredBy: row.userId,
      registeredByEmail: row.user.email,
      cancelledAt: row.cancelledAt,
      cancellationReason: row.cancellationReason,
    }));
  }
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
