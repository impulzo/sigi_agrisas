export interface ListDriversRequest {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}
