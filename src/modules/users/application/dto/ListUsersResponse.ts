import { AdminUser } from "@/modules/users/domain/entities/AdminUser";

export interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}
