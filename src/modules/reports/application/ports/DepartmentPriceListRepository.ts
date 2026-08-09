import { Decimal } from "decimal.js";
import { DepartmentPriceListFilters } from "../../domain/value-objects/DepartmentPriceListFilters";

/**
 * Una fila por (producto, precio). Un producto SIN listas de precio se
 * representa con UNA fila cuyo `priceId` es `null` (y `price` `null`), para
 * que el use case lo incluya con `prices: []` en lugar de omitirlo.
 */
export interface RawPriceListRow {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  productId: string;
  code: string;
  name: string;
  unit: string;
  ivaRate: Decimal | null;
  iepsRate: Decimal | null;
  priceId: string | null;
  priceName: string | null;
  price: Decimal | null;
  minQuantity: number;
  discountPct: Decimal | null;
  isDefault: boolean;
}

export interface DepartmentPriceListRepository {
  findRows(filters: DepartmentPriceListFilters): Promise<RawPriceListRow[]>;
}
