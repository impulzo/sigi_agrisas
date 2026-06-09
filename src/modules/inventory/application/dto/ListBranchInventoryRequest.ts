export interface ListBranchInventoryRequest {
  branchId: string;
  page: number;
  pageSize: number;
  search?: string;
  belowReorder: boolean;
}
