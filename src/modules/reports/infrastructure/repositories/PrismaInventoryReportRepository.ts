import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { InventoryReportRepository, RawStockRow } from "../../application/ports/InventoryReportRepository";
import { StockReportFilters } from "../../domain/value-objects/StockReportFilters";

export class PrismaInventoryReportRepository implements InventoryReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findStockGrouped(filters: StockReportFilters): Promise<RawStockRow[]> {
    const rows = await this.prisma.branchInventory.findMany({
      where: {
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.departmentId
          ? { product: { departmentId: filters.departmentId } }
          : {}),
      },
      include: {
        product: { include: { department: true } },
        branch: true,
      },
      orderBy: [
        { branch: { name: "asc" } },
        { product: { department: { name: "asc" } } },
        { product: { name: "asc" } },
      ],
    });

    return rows.map((row) => ({
      branchId: row.branchId,
      branchCode: row.branch.code,
      branchName: row.branch.name,
      isHeadquarters: row.branch.isHeadquarters,
      departmentId: row.product.departmentId,
      departmentCode: row.product.department?.code ?? "",
      departmentName: row.product.department?.name ?? "",
      productId: row.productId,
      code: row.product.code,
      name: row.product.name,
      unit: row.product.unit,
      quantity: row.quantity as unknown as Decimal,
      reservedQuantity: row.reservedQuantity as unknown as Decimal,
      reorderPoint: row.reorderPoint as unknown as Decimal,
    }));
  }
}
