import { Product } from "../../domain/entities/Product";

export interface ProductWithDepartment {
  product: Product;
  departmentName: string;
}

export interface FindAllProductsOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
  departmentId?: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  unit: string;
  departmentId: string;
  satProductCode?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  unit?: string;
  satProductCode?: string | null;
  departmentId?: string;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}

export interface ProductRepository {
  findAll(opts: FindAllProductsOptions): Promise<{ items: ProductWithDepartment[]; total: number }>;
  findById(id: string): Promise<ProductWithDepartment | null>;
  create(data: CreateProductData): Promise<ProductWithDepartment>;
  update(id: string, data: UpdateProductData): Promise<ProductWithDepartment>;
  softDelete(id: string): Promise<void>;
}
