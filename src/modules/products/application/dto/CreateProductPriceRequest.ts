export interface CreateProductPriceRequest {
  name: string;
  price: number;
  minQuantity?: number;
  discountPct?: number | null;
  isDefault?: boolean;
}
