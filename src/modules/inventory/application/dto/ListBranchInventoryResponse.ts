import { BranchInventoryDto } from "./BranchInventoryDto";

export interface ListBranchInventoryResponse {
  items: BranchInventoryDto[];
  total: number;
  page: number;
  pageSize: number;
}
