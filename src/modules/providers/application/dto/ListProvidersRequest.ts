export interface ListProvidersRequest {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}
