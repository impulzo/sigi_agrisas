import { Branch } from "@/modules/branches/domain/entities/Branch";

export interface FindAllBranchesOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
}

export interface CreateBranchData {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isHeadquarters?: boolean;
  isActive?: boolean;
}

export interface UpdateBranchData {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isHeadquarters?: boolean;
  isActive?: boolean;
}

export interface BranchRepository {
  findAll(opts: FindAllBranchesOptions): Promise<{ items: Branch[]; total: number }>;
  findById(id: string): Promise<Branch | null>;
  findHeadquarters(): Promise<Branch | null>;
  create(data: CreateBranchData): Promise<Branch>;
  update(id: string, data: UpdateBranchData): Promise<Branch>;
  softDelete(id: string): Promise<void>;
}
