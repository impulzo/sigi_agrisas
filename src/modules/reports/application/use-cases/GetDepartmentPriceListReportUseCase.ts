import { Decimal } from "decimal.js";
import {
  DepartmentPriceListRepository,
  RawPriceListRow,
} from "../ports/DepartmentPriceListRepository";
import { DepartmentPriceListFilters } from "../../domain/value-objects/DepartmentPriceListFilters";
import {
  DepartmentPriceListResponseDto,
  DepartmentPriceListDepartmentDto,
  DepartmentProductDto,
  DepartmentPriceDto,
} from "../dto/DepartmentPriceListResponseDto";

export class GetDepartmentPriceListReportUseCase {
  constructor(private readonly repo: DepartmentPriceListRepository) {}

  async execute(
    req: DepartmentPriceListFilters & { generatedBy: { userId: string; email: string } }
  ): Promise<DepartmentPriceListResponseDto> {
    const rows = await this.repo.findRows({
      departmentId: req.departmentId ?? null,
      branchId: req.branchId ?? null,
    });

    const deptMap = new Map<string, DepartmentPriceListDepartmentDto>();

    for (const row of rows) {
      let dept = deptMap.get(row.departmentId);
      if (!dept) {
        dept = {
          departmentId: row.departmentId,
          departmentCode: row.departmentCode,
          departmentName: row.departmentName,
          products: [],
          subtotal: { productCount: 0, priceCount: 0, totalStock: "0.0000" },
        };
        deptMap.set(row.departmentId, dept);
      }

      let product = dept.products.find((p) => p.productId === row.productId);
      if (!product) {
        product = {
          productId: row.productId,
          code: row.code,
          name: row.name,
          unit: row.unit,
          unitDescription: row.unitDescription,
          stockQuantity: row.stockQuantity.toFixed(4),
          ivaRate: row.ivaRate ? row.ivaRate.toFixed(4) : null,
          iepsRate: row.iepsRate ? row.iepsRate.toFixed(4) : null,
          acquisitionPrice: row.acquisitionPrice ? row.acquisitionPrice.toFixed(4) : null,
          prices: [],
        };
        dept.products.push(product);
      }

      if (row.priceId) {
        product.prices.push(this.toPriceDto(row));
      }
    }

    let totalProductCount = 0;
    let totalPriceCount = 0;
    let totalStock = new Decimal(0);

    for (const dept of deptMap.values()) {
      const deptStock = dept.products.reduce(
        (acc, p) => acc.plus(new Decimal(p.stockQuantity)),
        new Decimal(0)
      );
      dept.subtotal = {
        productCount: dept.products.length,
        priceCount: dept.products.reduce((acc, p) => acc + p.prices.length, 0),
        totalStock: deptStock.toFixed(4),
      };
      totalProductCount += dept.subtotal.productCount;
      totalPriceCount += dept.subtotal.priceCount;
      totalStock = totalStock.plus(deptStock);
    }

    const departments = Array.from(deptMap.values());

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: { departmentId: req.departmentId ?? null, branchId: req.branchId ?? null },
      departments,
      totals: {
        departmentCount: departments.length,
        productCount: totalProductCount,
        priceCount: totalPriceCount,
        totalStock: totalStock.toFixed(4),
      },
    };
  }

  private toPriceDto(row: RawPriceListRow): DepartmentPriceDto {
    return {
      priceId: row.priceId as string,
      name: row.priceName as string,
      price: (row.price as Decimal).toFixed(4),
      minQuantity: row.minQuantity,
      discountPct: row.discountPct ? row.discountPct.toFixed(2) : null,
      isDefault: row.isDefault,
    };
  }
}
