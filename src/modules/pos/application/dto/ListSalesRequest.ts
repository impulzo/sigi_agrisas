import { SaleStatus } from "../../domain/entities/Sale";

export interface ListSalesRequest {
  page: number;
  pageSize: number;
  branchId?: string;
  customerId?: string;
  statuses?: SaleStatus[];
  from?: Date;
  to?: Date;
  search?: string;
}
