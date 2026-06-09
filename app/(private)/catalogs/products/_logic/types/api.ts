export interface ProductDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  satProductCode: string | null;
  departmentId: string;
  departmentName: string;
  ivaRate: number | null;
  iepsRate: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListProductsResponse {
  items: ProductDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProductsParams {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
  search?: string;
  departmentId?: string;
}

export interface CreateProductBody {
  code: string;
  name: string;
  unit: string;
  departmentId: string;
  satProductCode?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}

export interface UpdateProductBody {
  name?: string;
  unit?: string;
  departmentId?: string;
  satProductCode?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}

export interface ProductPriceDto {
  id: string;
  productId: string;
  name: string;
  price: number;
  minQuantity: number;
  discountPct: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListProductPricesResponse {
  items: ProductPriceDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatePriceBody {
  name: string;
  price: number;
  minQuantity?: number;
  discountPct?: number | null;
  isDefault?: boolean;
}

export interface UpdatePriceBody {
  name?: string;
  price?: number;
  minQuantity?: number;
  discountPct?: number | null;
  isDefault?: boolean;
}

export interface ProductDosificationDto {
  id: string;
  productId: string;
  name: string;
  numParts: number;
  isActive: boolean;
  computedUnitPrice: number | null;
  requiresDefaultPrice: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListProductDosificationsResponse {
  items: ProductDosificationDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDosificationBody {
  name: string;
  numParts: number;
  isActive?: boolean;
}

export interface UpdateDosificationBody {
  name?: string;
  numParts?: number;
  isActive?: boolean;
}
