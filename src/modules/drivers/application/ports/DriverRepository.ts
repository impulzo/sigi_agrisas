import { Driver } from "../../domain/entities/Driver";

export interface CreateDriverData {
  code: string;
  name: string;
  rfc?: string | null;
  licenseNumber: string;
  notes?: string | null;
}

export interface UpdateDriverData {
  name?: string;
  rfc?: string | null;
  licenseNumber?: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface FindAllOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}

export interface DriverRepository {
  findAll(options: FindAllOptions): Promise<{ items: Driver[]; total: number }>;
  findById(id: string): Promise<Driver | null>;
  create(data: CreateDriverData): Promise<Driver>;
  update(id: string, data: UpdateDriverData): Promise<Driver>;
}
