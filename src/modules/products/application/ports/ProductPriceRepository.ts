import { ProductPrice } from "../../domain/entities/ProductPrice";

export interface CreateProductPriceData {
  productId: string;
  /** null/omitted = precio base (aplica a toda sucursal sin override propio). */
  branchId?: string | null;
  name: string;
  price: number;
  minQuantity: number;
  discountPct?: number | null;
  isDefault: boolean;
}

export interface UpdateProductPriceData {
  name?: string;
  price?: number;
  minQuantity?: number;
  discountPct?: number | null;
  isDefault?: boolean;
}

export interface ProductPriceRepository {
  /** Precios base únicamente (branchId: null) — comportamiento del listado sin filtro de sucursal. */
  findByProductId(productId: string): Promise<ProductPrice[]>;
  /** Conjunto efectivo para una sucursal: sus overrides propios + los base sin override del mismo nombre. */
  findEffectiveForBranch(productId: string, branchId: string): Promise<ProductPrice[]>;
  findById(id: string): Promise<ProductPrice | null>;
  /** branchId omitido/null = default global; branchId presente = default del bucket de esa sucursal. */
  findDefaultByProductId(productId: string, branchId?: string | null): Promise<ProductPrice | null>;
  create(data: CreateProductPriceData): Promise<ProductPrice>;
  update(id: string, data: UpdateProductPriceData): Promise<ProductPrice>;
  unsetDefaultForProduct(productId: string, branchId: string | null, exceptId?: string): Promise<void>;
  /** Atomically unsets any existing default in the SAME (productId, branchId) bucket and updates the target price in one operation. */
  unsetDefaultAndUpdate(
    productId: string,
    branchId: string | null,
    priceId: string,
    data: UpdateProductPriceData
  ): Promise<ProductPrice>;
  delete(id: string): Promise<void>;
}
