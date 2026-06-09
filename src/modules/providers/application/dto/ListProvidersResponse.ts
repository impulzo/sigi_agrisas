import { ProviderDto } from "./ProviderDto";

export interface ListProvidersResponse {
  items: ProviderDto[];
  total: number;
  page: number;
  pageSize: number;
}
