export interface DepartmentPriceDto {
  priceId: string;
  name: string;
  price: string;
  minQuantity: number;
  discountPct: string | null;
  isDefault: boolean;
}

export interface DepartmentProductDto {
  productId: string;
  code: string;
  name: string;
  unit: string;
  unitDescription: string | null;
  stockQuantity: string;
  ivaRate: string | null;
  iepsRate: string | null;
  acquisitionPrice: string | null;
  prices: DepartmentPriceDto[];
}

export interface DepartmentPriceListDepartmentDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  products: DepartmentProductDto[];
  subtotal: { productCount: number; priceCount: number; totalStock: string };
}

export interface DepartmentPriceListResponseDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: { departmentId: string | null; branchId: string | null };
  departments: DepartmentPriceListDepartmentDto[];
  totals: { departmentCount: number; productCount: number; priceCount: number; totalStock: string };
}
