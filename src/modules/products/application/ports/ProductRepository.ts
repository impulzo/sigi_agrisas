import { Product } from "../../domain/entities/Product";

export interface ProductWithDepartment {
  product: Product;
  departmentName: string;
  taxRateCode: string | null;
  taxRate: { id: string; code: string; name: string; rate: number } | null;
  providerName: string | null;
  providerId: string | null;
  stock: number | null;
  /** Description resuelta contra `sat_units_of_measure`; null si `unit` no matchea el catálogo (dato legacy). */
  unitDescription: string | null;
}

export interface FindAllProductsOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
  departmentId?: string;
  providerId?: string;
  branchId?: string;
  /** Cuando true y hay `branchId`, restringe el resultado a productos con fila en `branch_inventory` de esa sucursal (no sólo el join de stock). */
  branchScoped?: boolean;
  satProductCode?: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  unit: string;
  departmentId: string;
  taxRateId?: string | null;
  satProductCode?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  manufactureDate?: string | null;
  acquisitionPrice?: number | null;
  isTaxable?: boolean;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  unit?: string;
  satProductCode?: string | null;
  departmentId?: string;
  taxRateId?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  imageUrl?: string | null;
  manufactureDate?: string | null;
  acquisitionPrice?: number | null;
  isTaxable?: boolean;
  isActive?: boolean;
}

export interface ProductRepository {
  findAll(opts: FindAllProductsOptions): Promise<{ items: ProductWithDepartment[]; total: number }>;
  findById(id: string): Promise<ProductWithDepartment | null>;
  /** Lightweight existence check — no `include`/`unitDescription` resolution. Same criteria as `findById` (does not filter by `isActive`). */
  exists(id: string): Promise<boolean>;
  create(data: CreateProductData): Promise<ProductWithDepartment>;
  update(id: string, data: UpdateProductData): Promise<ProductWithDepartment>;
  softDelete(id: string): Promise<void>;
}
