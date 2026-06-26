import { PrismaClient, Prisma } from "@prisma/client";
import { BillingLookupService, SaleForBilling, CustomerForBilling, BranchForBilling } from "../../application/ports/BillingLookupService";

function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v.toString());
}

export class PrismaBillingLookupService implements BillingLookupService {
  constructor(private readonly prisma: PrismaClient) {}

  async findSaleWithItems(saleId: string): Promise<SaleForBilling | null> {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { product: { select: { satProductCode: true } } },
        },
      },
    });
    if (!sale) return null;

    return {
      id: sale.id,
      status: sale.status,
      branchId: sale.branchId,
      customerId: sale.customerId,
      paymentMethodId: sale.paymentMethodId,
      subtotal: toNum(sale.subtotal),
      taxTotal: toNum(sale.taxTotal),
      total: toNum(sale.total),
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productCodeSnapshot: item.productCodeSnapshot,
        productNameSnapshot: item.productNameSnapshot,
        satProductCode: (item as unknown as { product?: { satProductCode?: string | null } }).product?.satProductCode ?? null,
        quantity: toNum(item.quantity),
        unitPrice: toNum(item.unitPrice),
        discountPct: item.discountPct != null ? toNum(item.discountPct) : null,
        ivaRate: item.ivaRate != null ? toNum(item.ivaRate) : null,
        iepsRate: item.iepsRate != null ? toNum(item.iepsRate) : null,
        lineSubtotal: toNum(item.lineSubtotal),
        lineTotal: toNum(item.lineTotal),
      })),
    };
  }

  async findCustomer(customerId: string): Promise<CustomerForBilling | null> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      legalName: c.legalName,
      rfc: c.rfc,
      taxRegime: c.taxRegime,
      cfdiUse: c.cfdiUse,
      taxZipCode: c.taxZipCode,
    };
  }

  async findBranch(branchId: string): Promise<BranchForBilling | null> {
    const b = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!b) return null;
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address,
    };
  }
}
