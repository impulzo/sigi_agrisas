import { AdminUser } from "@/modules/users/domain/entities/AdminUser";

export interface AdminUserUpdateData {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  branchId?: string | null;
}

export interface AdminUserRepository {
  findAll(params: { page: number; pageSize: number }): Promise<{ users: AdminUser[]; total: number }>;
  findById(id: string): Promise<AdminUser | null>;
  update(id: string, data: AdminUserUpdateData): Promise<AdminUser>;
  delete(id: string): Promise<void>;
}
