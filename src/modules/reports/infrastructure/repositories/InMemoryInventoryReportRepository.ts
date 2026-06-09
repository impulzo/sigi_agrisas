import { Decimal } from "decimal.js";
import { InventoryReportRepository, RawStockRow } from "../../application/ports/InventoryReportRepository";
import { StockReportFilters } from "../../domain/value-objects/StockReportFilters";

export class InMemoryInventoryReportRepository implements InventoryReportRepository {
  constructor(private readonly rows: RawStockRow[]) {}

  async findStockGrouped(filters: StockReportFilters): Promise<RawStockRow[]> {
    return this.rows.filter((row) => {
      if (filters.branchId && row.branchId !== filters.branchId) return false;
      if (filters.departmentId && row.departmentId !== filters.departmentId) return false;
      return true;
    });
  }
}
