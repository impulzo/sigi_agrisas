import { QuoteStatus } from "../../domain/value-objects/QuoteStatus";

export interface ListQuotesRequest {
  page: number;
  pageSize: number;
  branchId?: string;
  customerId?: string;
  statuses?: QuoteStatus[];
  from?: Date;
  to?: Date;
  search?: string;
}
