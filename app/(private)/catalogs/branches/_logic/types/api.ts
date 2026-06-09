export interface BranchDto {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListBranchesResponse {
  items: BranchDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBranchBody {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export interface UpdateBranchBody {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
}
