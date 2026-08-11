import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  DepartmentPriceListRepository,
  RawPriceListRow,
} from "../../application/ports/DepartmentPriceListRepository";
import { DepartmentPriceListFilters } from "../../domain/value-objects/DepartmentPriceListFilters";

export class PrismaDepartmentPriceListRepository implements DepartmentPriceListRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRows(filters: DepartmentPriceListFilters): Promise<RawPriceListRow[]> {
    const products = await this.prisma.product.findMany({
      where: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      include: {
        department: true,
        prices: { orderBy: [{ isDefault: "desc" }, { name: "asc" }] },
      },
      orderBy: [
        { department: { name: "asc" } },
        { name: "asc" },
      ],
    });

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
        ivaRate: product.ivaRate as unknown as Decimal | null,
        iepsRate: product.iepsRate as unknown as Decimal | null,
      };

      if (product.prices.length === 0) {
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

      for (const price of product.prices) {
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
