export interface ProductPriceDto {
  id: string;
  productId: string;
  branchId: string | null;
  /** `branchId !== null` — convenience flag so the UI doesn't re-derive it. */
  isOverride: boolean;
  name: string;
  price: number;
  minQuantity: number;
  discountPct: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
