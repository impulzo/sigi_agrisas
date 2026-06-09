import { Decimal } from "decimal.js";
import { StockReportFilters } from "../../domain/value-objects/StockReportFilters";

export interface RawStockRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  isHeadquarters: boolean;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  productId: string;
  code: string;
  name: string;
  unit: string;
  quantity: Decimal;
  reservedQuantity: Decimal;
  reorderPoint: Decimal;
}

export interface InventoryReportRepository {
  findStockGrouped(filters: StockReportFilters): Promise<RawStockRow[]>;
}
