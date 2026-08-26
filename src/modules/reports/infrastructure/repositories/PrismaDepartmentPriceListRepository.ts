import { Prisma, PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  DepartmentPriceListRepository,
  RawPriceListRow,
} from "../../application/ports/DepartmentPriceListRepository";
import { DepartmentPriceListFilters } from "../../domain/value-objects/DepartmentPriceListFilters";
import { resolveUnitDescriptions } from "@/shared/infrastructure/sat-codes/resolveUnitDescriptions";
import { resolveEffectivePrices } from "@/modules/products/domain/services/resolveEffectivePrices";

export class PrismaDepartmentPriceListRepository implements DepartmentPriceListRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRows(filters: DepartmentPriceListFilters): Promise<RawPriceListRow[]> {
    const products = await this.prisma.product.findMany({
      where: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      include: {
        department: true,
        // Sin branchId: sólo precios base. Con branchId: base + overrides propios
        // de la sucursal, resueltos al conjunto efectivo abajo.
        prices: {
          where: filters.branchId ? { OR: [{ branchId: null }, { branchId: filters.branchId }] } : { branchId: null },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        },
      },
      orderBy: [
        { department: { name: "asc" } },
        { name: "asc" },
      ],
    });

    const stockRows = await this.prisma.$queryRaw<Array<{ product_id: string; qty: string }>>`
      SELECT product_id, COALESCE(SUM(quantity), 0) AS qty
      FROM branch_inventory
      WHERE ${filters.branchId ? Prisma.sql`branch_id = ${filters.branchId}` : Prisma.sql`TRUE`}
      GROUP BY product_id
    `;
    const stockMap = new Map(stockRows.map((r) => [r.product_id, new Decimal(r.qty)]));
    const unitMap = await resolveUnitDescriptions(this.prisma, products.map((p) => p.unit));

    const rows: RawPriceListRow[] = [];

    for (const product of products) {
      const base = {
        departmentId: product.departmentId,
        departmentCode: product.department.code ?? "",
        departmentName: product.department.name,
        productId: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        unitDescription: unitMap.get(product.unit) ?? null,
        stockQuantity: (stockMap.get(product.id) ?? new Decimal(0)) as unknown as Decimal,
        ivaRate: product.ivaRate as unknown as Decimal | null,
        iepsRate: product.iepsRate as unknown as Decimal | null,
        acquisitionPrice: product.acquisitionPrice as unknown as Decimal | null,
      };

      const effectivePrices = filters.branchId
        ? resolveEffectivePrices(product.prices, filters.branchId)
        : product.prices;

      if (effectivePrices.length === 0) {
        rows.push({
          ...base,
          priceId: null,
          priceName: null,
          price: null,
          minQuantity: 1,
          discountPct: null,
          isDefault: false,
        });
        continue;
      }

      for (const price of effectivePrices) {
        rows.push({
          ...base,
          priceId: price.id,
          priceName: price.name,
          price: price.price as unknown as Decimal,
          minQuantity: price.minQuantity,
          discountPct: price.discountPct as unknown as Decimal | null,
          isDefault: price.isDefault,
        });
      }
    }

    return rows;
  }
}
