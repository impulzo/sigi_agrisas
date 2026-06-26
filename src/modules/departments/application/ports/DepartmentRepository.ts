import { Department } from "@/modules/departments/domain/entities/Department";

export interface FindAllDepartmentsOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  providerId?: string;
}

export interface CreateDepartmentData {
  code: string;
  name: string;
  description?: string | null;
  providerId?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string | null;
  providerId?: string | null;
  isActive?: boolean;
}

export interface DepartmentRepository {
  findAll(opts: FindAllDepartmentsOptions): Promise<{ items: Department[]; total: number }>;
  findById(id: string): Promise<Department | null>;
  create(data: CreateDepartmentData): Promise<Department>;
  update(id: string, data: UpdateDepartmentData): Promise<Department>;
  softDelete(id: string): Promise<void>;
}
