import { Decimal } from "decimal.js";
import { InventoryReportRepository, RawStockRow } from "../ports/InventoryReportRepository";
import { GetStockReportRequest } from "../dto/GetStockReportRequest";
import {
  StockReportResponseDto,
  StockBranchDto,
  StockDepartmentDto,
  StockProductDto,
} from "../dto/StockReportResponseDto";

export class GetInventoryStockReportUseCase {
  constructor(private readonly repo: InventoryReportRepository) {}

  async execute(req: GetStockReportRequest): Promise<StockReportResponseDto> {
    const rows = await this.repo.findStockGrouped({
      branchId: req.branchId ?? null,
      departmentId: req.departmentId ?? null,
      includeZeroStock: req.includeZeroStock,
    });

    const filteredRows = req.includeZeroStock
      ? rows
      : rows.filter((r) => !r.quantity.equals(new Decimal(0)));

    const branchMap = new Map<string, StockBranchDto>();

    for (const row of filteredRows) {
      if (!branchMap.has(row.branchId)) {
        branchMap.set(row.branchId, {
          branchId: row.branchId,
          branchCode: row.branchCode,
          branchName: row.branchName,
          isHeadquarters: row.isHeadquarters,
          departments: [],
          subtotal: { departmentCount: 0, productCount: 0, totalQuantity: "0.0000" },
        });
      }
      const branch = branchMap.get(row.branchId)!;

      let dept = branch.departments.find((d) => d.departmentId === row.departmentId);
      if (!dept) {
        dept = {
          departmentId: row.departmentId,
          departmentCode: row.departmentCode,
          departmentName: row.departmentName,
          products: [],
          subtotal: { productCount: 0, totalQuantity: "0.0000" },
        };
        branch.departments.push(dept);
      }

      const available = row.quantity.minus(row.reservedQuantity);
      const isBelowReorder = row.quantity.lessThan(row.reorderPoint);

      const product: StockProductDto = {
        productId: row.productId,
        code: row.code,
        name: row.name,
        unit: row.unit,
        quantity: row.quantity.toFixed(4),
        reservedQuantity: row.reservedQuantity.toFixed(4),
        reorderPoint: row.reorderPoint.toFixed(4),
        availableQuantity: available.toFixed(4),
        isBelowReorder,
      };
      dept.products.push(product);
    }

    for (const branch of branchMap.values()) {
      let branchTotalQty = new Decimal(0);
      let branchProductCount = 0;

      for (const dept of branch.departments) {
        let deptTotalQty = new Decimal(0);
        for (const p of dept.products) {
          deptTotalQty = deptTotalQty.plus(new Decimal(p.quantity));
        }
        dept.subtotal = {
          productCount: dept.products.length,
          totalQuantity: deptTotalQty.toFixed(4),
        };
        branchTotalQty = branchTotalQty.plus(deptTotalQty);
        branchProductCount += dept.products.length;
      }

      branch.subtotal = {
        departmentCount: branch.departments.length,
        productCount: branchProductCount,
        totalQuantity: branchTotalQty.toFixed(4),
      };
    }

    const branches = Array.from(branchMap.values());

    let totalBranchCount = branches.length;
    let totalDeptCount = 0;
    let totalProductCount = 0;
    let totalQty = new Decimal(0);

    for (const b of branches) {
      totalDeptCount += b.departments.length;
      totalProductCount += b.subtotal.productCount;
      totalQty = totalQty.plus(new Decimal(b.subtotal.totalQuantity));
    }

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      filters: {
        branchId: req.branchId ?? null,
        departmentId: req.departmentId ?? null,
        includeZeroStock: req.includeZeroStock,
      },
      branches,
      totals: {
        branchCount: totalBranchCount,
        departmentCount: totalDeptCount,
        productCount: totalProductCount,
        totalQuantity: totalQty.toFixed(4),
      },
    };
  }
}
