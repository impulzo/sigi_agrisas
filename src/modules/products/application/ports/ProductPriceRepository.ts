import { ProductPrice } from "../../domain/entities/ProductPrice";

export interface CreateProductPriceData {
  productId: string;
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
  findByProductId(productId: string): Promise<ProductPrice[]>;
  findById(id: string): Promise<ProductPrice | null>;
  findDefaultByProductId(productId: string): Promise<ProductPrice | null>;
  create(data: CreateProductPriceData): Promise<ProductPrice>;
  update(id: string, data: UpdateProductPriceData): Promise<ProductPrice>;
  unsetDefaultForProduct(productId: string, exceptId?: string): Promise<void>;
  /** Atomically unsets any existing default for the product and updates the target price in one operation. */
  unsetDefaultAndUpdate(productId: string, priceId: string, data: UpdateProductPriceData): Promise<ProductPrice>;
  delete(id: string): Promise<void>;
}
