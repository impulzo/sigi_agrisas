import { CustomerDto } from "./CustomerDto";

export interface ListCustomersResponse {
  items: CustomerDto[];
  total: number;
  page: number;
  pageSize: number;
}
