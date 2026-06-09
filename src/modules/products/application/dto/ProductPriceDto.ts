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
