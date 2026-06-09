export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListDepartmentsResponse {
  items: DepartmentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDepartmentBody {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentBody {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}
