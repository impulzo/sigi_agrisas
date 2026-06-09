import { SaleDto } from "./SaleDto";

export interface ListSalesResponse {
  items: SaleDto[];
  total: number;
  page: number;
  pageSize: number;
}
