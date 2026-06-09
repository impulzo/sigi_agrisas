export interface StockProductDto {
  productId: string;
  code: string;
  name: string;
  unit: string;
  quantity: string;
  reservedQuantity: string;
  reorderPoint: string;
  availableQuantity: string;
  isBelowReorder: boolean;
}

export interface StockDepartmentDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  products: StockProductDto[];
  subtotal: { productCount: number; totalQuantity: string };
}

export interface StockBranchDto {
  branchId: string;
  branchCode: string;
  branchName: string;
  isHeadquarters: boolean;
  departments: StockDepartmentDto[];
  subtotal: { departmentCount: number; productCount: number; totalQuantity: string };
}

export interface StockReportResponseDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    departmentId: string | null;
    includeZeroStock: boolean;
  };
  branches: StockBranchDto[];
  totals: {
    branchCount: number;
    departmentCount: number;
    productCount: number;
    totalQuantity: string;
  };
}
