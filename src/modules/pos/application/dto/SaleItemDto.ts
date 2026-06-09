export interface SaleItemDto {
  id: string;
  productId: string;
  productPriceId: string | null;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  priceNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  discountPct: number | null;
  ivaRate: number | null;
  iepsRate: number | null;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}
