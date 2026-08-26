export interface CreateProductPriceRequest {
  /** null/omitted = precio base (aplica a toda sucursal sin override propio). */
  branchId?: string | null;
  name: string;
  price: number;
  minQuantity?: number;
  discountPct?: number | null;
  isDefault?: boolean;
}
