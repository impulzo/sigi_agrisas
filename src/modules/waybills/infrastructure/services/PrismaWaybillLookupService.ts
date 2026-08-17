import { PrismaClient } from "@prisma/client";
import {
  WaybillLookupService,
  BranchForWaybill,
  CustomerForWaybill,
  ProductForWaybill,
  FolioForWaybill,
  SaleForWaybill,
} from "../../application/ports/WaybillLookupService";

export class PrismaWaybillLookupService implements WaybillLookupService {
  constructor(private readonly prisma: PrismaClient) {}

  async findBranch(branchId: string): Promise<BranchForWaybill | null> {
    const b = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!b) return null;
    return {
      id: b.id,
      name: b.name,
      isActive: b.isActive,
      addressStreet: b.addressStreet,
      addressExteriorNumber: b.addressExteriorNumber,
      addressInteriorNumber: b.addressInteriorNumber,
      addressNeighborhood: b.addressNeighborhood,
      addressMunicipality: b.addressMunicipality,
      addressState: b.addressState,
      addressCountry: b.addressCountry,
      addressZipCode: b.addressZipCode,
    };
  }

  async findProduct(productId: string): Promise<ProductForWaybill | null> {
    const p = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!p) return null;
    return { id: p.id, code: p.code, name: p.name, isActive: p.isActive };
  }

  async findFolioByCode(code: string): Promise<FolioForWaybill | null> {
    const f = await this.prisma.folio.findUnique({ where: { code } });
    if (!f) return null;
    return { id: f.id, isActive: f.isActive };
  }

  async findCustomer(customerId: string): Promise<CustomerForWaybill | null> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      isActive: c.isActive,
      addressStreet: c.addressStreet,
      addressExteriorNumber: c.addressExteriorNumber,
      addressInteriorNumber: c.addressInteriorNumber,
      addressNeighborhood: c.addressNeighborhood,
      addressMunicipality: c.addressMunicipality,
      addressState: c.addressState,
      addressCountry: c.addressCountry,
      addressZipCode: c.addressZipCode,
    };
  }

  async findSale(saleId: string): Promise<SaleForWaybill | null> {
    const s = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: { select: { productId: true, quantity: true, productNameSnapshot: true } } },
    });
    if (!s) return null;
    return {
      id: s.id,
      branchId: s.branchId,
      customerId: s.customerId,
      status: s.status,
      items: s.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity.toNumber(),
        productNameSnapshot: i.productNameSnapshot,
      })),
    };
  }
}
