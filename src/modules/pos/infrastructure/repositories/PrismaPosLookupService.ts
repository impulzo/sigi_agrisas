import { PrismaClient } from "@prisma/client";
import {
  PosLookupService,
  ProductLookup,
  ProductPriceLookup,
  CustomerLookup,
  BranchLookup,
  FolioLookup,
  PaymentMethodLookup,
} from "../../application/ports/PosLookups";

export class PrismaPosLookupService implements PosLookupService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProduct(id: string): Promise<ProductLookup | null> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, ivaRate: true, iepsRate: true, isTaxable: true, isActive: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      ivaRate: row.ivaRate ? Number(row.ivaRate) : null,
      iepsRate: row.iepsRate ? Number(row.iepsRate) : null,
      isTaxable: row.isTaxable,
      isActive: row.isActive,
    };
  }

  async getProductPrice(id: string): Promise<ProductPriceLookup | null> {
    const row = await this.prisma.productPrice.findUnique({
      where: { id },
      select: { id: true, productId: true, name: true, price: true, discountPct: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      productId: row.productId,
      name: row.name,
      price: Number(row.price),
      discountPct: row.discountPct ? Number(row.discountPct) : null,
    };
  }

  async getCustomer(id: string): Promise<CustomerLookup | null> {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, isActive: true, creditLimit: true, currentBalance: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      isActive: row.isActive,
      creditLimit: row.creditLimit ? Number(row.creditLimit) : null,
      currentBalance: Number(row.currentBalance),
    };
  }

  async getBranch(id: string): Promise<BranchLookup | null> {
    const row = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    return row ?? null;
  }

  async getFolio(id: string): Promise<FolioLookup | null> {
    const row = await this.prisma.folio.findUnique({
      where: { id },
      select: { id: true, code: true, prefix: true, scope: true, isActive: true },
    });
    if (!row) return null;
    return { ...row, scope: row.scope as FolioLookup["scope"] };
  }

  async getPaymentMethod(id: string): Promise<PaymentMethodLookup | null> {
    const row = await this.prisma.paymentMethod.findUnique({
      where: { id },
      select: { id: true, isActive: true, isCredit: true },
    });
    return row ?? null;
  }
}
