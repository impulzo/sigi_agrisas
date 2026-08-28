export interface CreateUserRequest {
  name: string;
  email: string;
  avatarUrl?: string | null;
  branchId?: string | null;
  roleIds?: string[];
}
