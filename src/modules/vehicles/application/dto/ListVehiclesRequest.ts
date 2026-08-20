export interface ListVehiclesRequest {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}
