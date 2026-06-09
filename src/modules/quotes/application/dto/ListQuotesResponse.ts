import { QuoteDto } from "./QuoteDto";

export interface ListQuotesResponse {
  items: QuoteDto[];
  total: number;
  page: number;
  pageSize: number;
}
