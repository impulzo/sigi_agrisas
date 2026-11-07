import { Prisma, PrismaClient } from "@prisma/client";
import { CashCutRepository } from "../../application/ports/CashCutRepository";
import { CashCutFilters, CashCutRawRow } from "../../domain/value-objects/CashCutFilters";

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export class PrismaCashCutRepository implements CashCutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRows(filters: CashCutFilters): Promise<CashCutRawRow[]> {
    const where: Prisma.CustomerPaymentWhereInput = {
      status: "completed",
      // Account payments (saleId=null, "abono a saldo general") have no
      // invoice to prorate IVA against — this report's shape is inherently
      // sale-centric (factura, saleTaxTotal/Subtotal/Total), so they are
      // excluded here. They still appear in /payments and reduce
      // customer.currentBalance normally; this is a known, deliberate gap
      // in this specific report, not a data-loss bug.
      saleId: { not: null },
      createdAt: { gte: filters.from, lte: endOfDay(filters.to) },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.paymentMethodId ? { paymentMethodId: filters.paymentMethodId } : {}),
    };

    const payments = await this.prisma.customerPayment.findMany({
      where,
      include: { sale: true, customer: true, paymentMethod: true },
      orderBy: { createdAt: "asc" },
    });

    return payments.map((p) => ({
      paymentId: p.id,
      saleId: p.saleId!,
      customerId: p.customerId,
      customerCode: p.customer.code,
      docto: p.folioCode,
      factura: p.sale!.folioCode,
      customerName: p.customer.name,
      facturaDate: p.sale!.createdAt,
      amount: Number(p.amount),
      paymentMethodId: p.paymentMethodId,
      paymentMethodCode: p.paymentMethod.code,
      paymentMethodName: p.paymentMethod.name,
      reference: p.notes,
      collectedAt: p.createdAt,
      saleTaxTotal: Number(p.sale!.taxTotal),
      saleSubtotal: Number(p.sale!.subtotal),
      saleTotal: Number(p.sale!.total),
    }));
  }
}
