import { PrismaClient } from "@prisma/client";
import {
  WaybillLookupService,
  BranchForWaybill,
  ProductForWaybill,
  FolioForWaybill,
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
}
